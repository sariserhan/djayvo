#include "plan_import.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <filesystem>
#include <locale>
#include <map>
#include <sstream>
#include <variant>

namespace {
constexpr std::size_t max_bytes=4*1024*1024;
[[noreturn]] void reject(const char* reason) { throw std::invalid_argument(reason); }
struct Json {
    using Array=std::vector<Json>;
    using Object=std::map<std::string,Json>;
    std::variant<std::nullptr_t,bool,double,std::string,Array,Object> value;
    template<class T> const T& as() const {
        const auto* result=std::get_if<T>(&value);
        if (!result) reject("plan field has wrong type");
        return *result;
    }
    const Json& at(const char* key) const {
        const auto& object=as<Object>();
        const auto it=object.find(key);
        if (it==object.end()) reject("plan field is missing");
        return it->second;
    }
    bool has(const char* key) const { return as<Object>().count(key)!=0; }
    void keys(std::initializer_list<const char*> required, std::initializer_list<const char*> optional={}) const {
        const auto& object=as<Object>();
        for (const auto* key:required) at(key);
        for (const auto& entry:object)
            if (std::none_of(required.begin(),required.end(),[&](const char* k){return entry.first==k;}) &&
                std::none_of(optional.begin(),optional.end(),[&](const char* k){return entry.first==k;}))
                reject("unsupported plan field");
    }
    double number() const { return as<double>(); }
    std::uint32_t integer(std::uint32_t high=4294967295U) const {
        const double n=number();
        if (n<0 || n>high || std::floor(n)!=n) reject("plan integer outside bounds");
        return static_cast<std::uint32_t>(n);
    }
    const Array& array(std::size_t low,std::size_t high) const {
        const auto& a=as<Array>();
        if (a.size()<low || a.size()>high) reject("plan array outside bounds");
        return a;
    }
    const std::string& string() const { return as<std::string>(); }
    bool boolean() const { return as<bool>(); }
};

// Deliberately bounded ASCII-schema parser: all permitted plan strings are ASCII.
class Parser {
    const std::string& text;
    std::size_t pos=0,nodes=0;
    void space() { while (pos<text.size() && std::string(" \r\n\t").find(text[pos])!=std::string::npos) ++pos; }
    bool take(char c) { space(); if (pos<text.size() && text[pos]==c) {++pos;return true;} return false; }
    void need(char c) { if (!take(c)) reject("malformed plan JSON"); }
    bool digit() const { return pos<text.size() && text[pos]>='0' && text[pos]<='9'; }
    std::string string() {
        need('"');std::string result;
        while (pos<text.size()) {
            unsigned char c=static_cast<unsigned char>(text[pos++]);
            if (c=='"') return result;
            if (c=='\\') {
                if (pos==text.size()) reject("unfinished JSON escape");
                c=static_cast<unsigned char>(text[pos++]);
                if (c=='u') {
                    unsigned code=0;
                    for (int i=0;i<4;++i) {
                        if (pos==text.size()) reject("unfinished Unicode escape");
                        const auto h=text[pos++];
                        const auto hex=std::string("0123456789abcdef").find(h>='A' && h<='F'?static_cast<char>(h-'A'+'a'):h);
                        if (hex==std::string::npos) reject("invalid Unicode escape");
                        code=code*16+static_cast<unsigned>(hex);
                    }
                    if (code<32 || code>126) reject("plan strings must be printable ASCII");
                    c=static_cast<unsigned char>(code);
                } else if (c!='"' && c!='\\' && c!='/') reject("unsupported control escape in plan string");
            }
            if (c<32 || c>126 || result.size()>=128) reject("invalid or oversized plan string");
            result.push_back(static_cast<char>(c));
        }
        reject("unfinished JSON string");
    }
    Json parse(unsigned depth) {
        if (depth>16 || ++nodes>100000) reject("plan nesting/node budget exceeded");
        space();if (pos==text.size()) reject("empty JSON value");
        if (text[pos]=='"') return {string()};
        if (take('{')) {
            Json::Object object;
            if (!take('}')) do {
                const auto key=string();need(':');
                auto item=parse(depth+1);
                if (!object.emplace(key,std::move(item)).second) reject("duplicate JSON key");
                if (take('}')) return {std::move(object)};
                need(',');
            } while (true);
            return {std::move(object)};
        }
        if (take('[')) {
            Json::Array array;
            if (!take(']')) do {
                array.push_back(parse(depth+1));
                if (take(']')) return {std::move(array)};
                need(',');
            } while (true);
            return {std::move(array)};
        }
        for (const auto* literal:{"true","false","null"}) {
            const std::string token=literal;
            if (text.compare(pos,token.size(),token)==0) {
                pos+=token.size();
                if (token=="null") return {nullptr};
                return {token=="true"};
            }
        }
        const auto begin=pos;
        if (text[pos]=='-') ++pos;
        if (!digit()) reject("invalid JSON number");
        if (text[pos]=='0') ++pos;
        else while (digit()) ++pos;
        if (pos<text.size() && text[pos]=='.') {
            ++pos;if (!digit()) reject("invalid JSON fraction");while (digit()) ++pos;
        }
        if (pos<text.size() && (text[pos]=='e' || text[pos]=='E')) {
            ++pos;if (pos<text.size() && (text[pos]=='+' || text[pos]=='-')) ++pos;
            if (!digit()) reject("invalid JSON exponent");
            while (digit()) ++pos;
        }
        std::istringstream stream(text.substr(begin,pos-begin));stream.imbue(std::locale::classic());
        double number=0;stream>>number;
        if (!stream || !std::isfinite(number)) reject("nonfinite/out-of-range JSON number");
        return {number};
    }
public:
    explicit Parser(const std::string& input):text(input) {}
    Json run() {
        if (text.size()>max_bytes) reject("plan exceeds 4 MiB");
        auto result=parse(0);space();if (pos!=text.size()) reject("trailing JSON data");return result;
    }
};
djayvo::Region region(const Json& j) {
    j.keys({"start_frame","end_frame","confidence"});
    return {j.at("start_frame").integer(),j.at("end_frame").integer(),j.at("confidence").number()};
}
}

std::string read_plan_document(const std::string& path) {
    std::error_code error;
    if (!std::filesystem::is_regular_file(path,error)) reject("plan must be a local regular file");
    std::ifstream file(path,std::ios::binary);
    if (!file) reject("cannot open plan");
    std::string text(max_bytes+1,'\0');file.read(text.data(),static_cast<std::streamsize>(text.size()));
    if (file.bad() || (!file.eof() && file.fail())) reject("cannot read plan");
    text.resize(static_cast<std::size_t>(file.gcount()));
    if (text.size()>max_bytes) reject("plan exceeds 4 MiB");
    return text;
}

djayvo::RemixPlan import_plan(const std::string& text,const djayvo::AudioBuffer& source,
                             djayvo::Strategy strategy,std::uint32_t seed,bool synthetic,bool consent) {
    using namespace djayvo;
    if (synthetic==consent) reject("explicit source permission required outside plan");
    const auto j=Parser(text).run();
    j.keys({"schema_version","seed","source_asset_id","sample_rate","source","tempo_milli_bpm",
            "ticks_per_quarter","time_signature","target_bars","tail_ms","strategy","key","mix",
            "analysis","sections","voice_clips","voice_events","tracks"});
    const bool transforms=j.at("schema_version").string()=="1.1-remix";
    if ((!transforms && j.at("schema_version").string()!="1.0-remix") || j.at("ticks_per_quarter").integer()!=960 ||
        j.at("strategy").string()!=strategy_name(strategy) || j.at("seed").integer()!=seed ||
        j.at("sample_rate").integer()!=source.sample_rate || j.at("source_asset_id").string()!="sha256:"+source.sha256)
        reject("plan version/source/request mismatch");
    const auto& s=j.at("source");
    s.keys({"sha256","original_rate","original_frames","processed_frames","kind","consent_confirmed"});
    if (s.at("sha256").string()!=source.sha256 || s.at("original_rate").integer()!=source.original_rate ||
        s.at("original_frames").integer()!=source.original_frames || s.at("processed_frames").integer()!=source.mono.size() ||
        s.at("kind").string()!=(synthetic?"synthetic":"recorded") || s.at("consent_confirmed").boolean()!=consent)
        reject("plan source metadata/permission mismatch");
    RemixPlan r;r.source_sha256=source.sha256;r.synthetic_source=synthetic;r.consent_confirmed=consent;r.strategy=strategy;
    auto& p=r.music;p.seed=seed;p.sample_rate=source.sample_rate;
    p.tempo_milli_bpm=j.at("tempo_milli_bpm").integer(300000);
    const auto& signature=j.at("time_signature").array(2,2);
    p.numerator=static_cast<int>(signature[0].integer(16));p.denominator=static_cast<int>(signature[1].integer(16));
    p.bars=static_cast<int>(j.at("target_bars").integer(256));p.tail_ms=j.at("tail_ms").integer(10000);
    const auto& key=j.at("key");key.keys({"tonic_midi","mode"});
    r.tonic_midi=static_cast<int>(key.at("tonic_midi").integer(71));
    if (key.at("mode").string()!="minor") reject("unsupported key mode");
    const auto& mix=j.at("mix");
    mix.keys({"master_target_peak_dbfs","clean_hook_instrument_duck_db"},{"instrument_room_mix","kick_duck_db"});
    if (mix.at("clean_hook_instrument_duck_db").number()!=-16.4781748189) reject("unsupported hook ducking");
    p.ceiling_dbfs=mix.at("master_target_peak_dbfs").number();
    if (mix.has("instrument_room_mix")) r.instrument_room_mix=mix.at("instrument_room_mix").number();
    if (mix.has("kick_duck_db")) p.kick_duck_db=mix.at("kick_duck_db").number();
    const auto& a=j.at("analysis");
    a.keys({"peak","rms","normalization_gain","pitch_hz","pitch_confidence","onsets","phrases"});
    r.analysis={a.at("peak").number(),a.at("rms").number(),a.at("normalization_gain").number(),
                a.at("pitch_hz").number(),a.at("pitch_confidence").number(),{}, {}};
    for (const auto& onset:a.at("onsets").array(0,2048)) r.analysis.onsets.push_back(onset.integer());
    for (const auto& phrase:a.at("phrases").array(1,128)) r.analysis.phrases.push_back(region(phrase));
    for (const auto& section:j.at("sections").array(1,256)) {
        section.keys({"name","start_bar","bars"});
        p.sections.push_back({section.at("name").string(),static_cast<int>(section.at("start_bar").integer(255)),
                              static_cast<int>(section.at("bars").integer(256))});
    }
    for (const auto& clip:j.at("voice_clips").array(1,64)) {
        clip.keys({"id","start_frame","end_frame","confidence"});
        if (clip.at("id").integer(63)!=r.clips.size()) reject("clip IDs must match ordered indices");
        r.clips.push_back({clip.at("start_frame").integer(),clip.at("end_frame").integer(),clip.at("confidence").number()});
    }
    for (const auto& e:j.at("voice_events").array(1,1024)) {
        if (transforms) e.keys({"start_tick","clip_id","gain_db","rate","reverse","pan","clean"},
                               {"pitch_semitones","time_stretch"});
        else e.keys({"start_tick","clip_id","gain_db","rate","reverse","pan","clean"});
        r.vocals.push_back({e.at("start_tick").integer(),e.at("clip_id").integer(63),e.at("gain_db").number(),
                            e.at("rate").number(),e.at("reverse").boolean(),e.at("pan").number(),e.at("clean").boolean()});
        if (e.has("pitch_semitones")) r.vocals.back().pitch_semitones=e.at("pitch_semitones").number();
        if (e.has("time_stretch")) r.vocals.back().time_stretch=e.at("time_stretch").number();
    }
    std::size_t notes=0;
    for (const auto& t:j.at("tracks").array(1,32)) {
        t.keys({"instrument","gain_db","pan","events"},{"sound"});
        Track track;const auto& name=t.at("instrument").string();
        if (name=="piano") track.instrument=Instrument::piano;
        else if (name=="bass") track.instrument=Instrument::bass;
        else if (name=="drums") track.instrument=Instrument::drums;
        else reject("unsupported instrument/asset");
        track.gain_db=t.at("gain_db").number();track.pan=t.at("pan").number();
        if (t.has("sound")) {
            const auto& sound=t.at("sound").string();
            if (sound!="acoustic" && sound!="electronic") reject("unsupported sound bank");
            track.electronic=sound=="electronic";
        }
        for (const auto& e:t.at("events").array(0,100000)) {
            if (++notes>100000) reject("plan event budget exceeded");
            e.keys({"start_tick","duration_ticks","note","velocity"});
            track.notes.push_back({e.at("start_tick").integer(),e.at("duration_ticks").integer(),
                                  static_cast<int>(e.at("note").integer(108)),static_cast<int>(e.at("velocity").integer(127))});
            const auto& note=track.notes.back();
            const int degree=((note.pitch-r.tonic_midi)%12+12)%12;
            // The current minor-key contract permits short chromatic passing notes.
            if (track.instrument!=Instrument::drums && note.duration>ticks_per_quarter/2 &&
                degree!=0 && degree!=2 && degree!=3 && degree!=5 && degree!=7 && degree!=8 && degree!=10)
                reject("sustained note conflicts with declared minor key");
        }
        p.tracks.push_back(std::move(track));
    }
    validate(r,source);
    return r;
}

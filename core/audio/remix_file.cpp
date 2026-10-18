#include "djayvo/remix.h"
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iterator>
#include <locale>
#include <stdexcept>

namespace djayvo {
void remix_file(const std::string& input,const std::string& output,const std::vector<Strategy>& strategies,
                 std::uint32_t rate,std::uint32_t seed,std::size_t block,bool synthetic,bool consent,bool stems,
                 const RenderControl& control,const PlanImport* imported) {
    namespace fs=std::filesystem;
    const auto destination=fs::path(output);
    if (input.empty() || output.empty() || destination.filename().empty() ||
        destination.filename()=="." || destination.filename()==".." || synthetic==consent || !block || block>65536 ||
        strategies.empty() || strategies.size()>8)
        throw std::invalid_argument("supply bounded options and exactly one source permission kind");
    if (imported && (strategies.size()!=1 ||
        (!imported->candidate_sha256.empty() && (imported->candidate_sha256.size()!=64 ||
         imported->candidate_sha256.find_first_not_of("0123456789abcdef")!=std::string::npos)) ||
        (imported->plan && (imported->candidate_sha256.empty() || imported->plan->strategy!=strategies[0] ||
         imported->plan->music.sample_rate!=rate || imported->plan->music.seed!=seed ||
         imported->plan->synthetic_source!=synthetic || imported->plan->consent_confirmed!=consent))))
        throw std::invalid_argument("import receipt does not match render request");
    control.check();
    const auto original=read_wav(input);
    if (original.original_frames<original.original_rate*2ULL || original.original_frames>original.original_rate*5ULL)
        throw std::invalid_argument("supply a 2..5 second input recording");
    control.check();
    const auto source=resample(original,rate);
    const auto analysis=analyze(source);
    std::vector<RemixPlan> plans;
    std::vector<std::string> suffixes;
    for (auto s:strategies) {
        if (std::any_of(plans.begin(),plans.end(),[s](const auto& p){return p.strategy==s;}))
            throw std::invalid_argument("duplicate export strategy");
        plans.push_back(imported && imported->plan?*imported->plan:make_remix(source,analysis,s,seed,synthetic,consent));
        validate(plans.back(),source);
        const auto style=std::string(".")+strategy_name(s);
        for (const auto* extension:{".wav",".score.json",".report.json",".events.tsv"}) suffixes.push_back(style+extension);
        if (stems) {
            for (const auto* stem:{"piano","bass","drums","vocals"}) suffixes.push_back(style+"."+stem+".wav");
            if (std::any_of(plans.back().music.tracks.begin(),plans.back().music.tracks.end(),[](const Track& t){return t.instrument==Instrument::guitar;}))
                suffixes.push_back(style+".guitar.wav");
        }
    }
    suffixes.push_back(".complete.json");
    for (const auto& suffix:suffixes) {
        const fs::path path=output+suffix;
        if (fs::exists(fs::symlink_status(path)) || fs::weakly_canonical(input)==fs::weakly_canonical(path))
            throw std::invalid_argument("export exists or aliases source; choose a new output prefix");
    }
    control.check();
    if (!destination.parent_path().empty()) fs::create_directories(destination.parent_path());
    const fs::path staging=output+".partial";
    if (!fs::create_directory(staging))
        throw std::runtime_error("export is in progress or interrupted; preserve .partial and choose a new prefix");
    const auto staged=[&](std::size_t i){return staging/("export"+suffixes[i]);};
    std::vector<std::size_t> published;
    const auto clean_stage=[&]() {
        std::error_code error;
        for (std::size_t i=0;i<suffixes.size();++i) fs::remove(staged(i),error);
        fs::remove(staging,error);
    };
    try {
        published.reserve(suffixes.size());
        for (const auto& plan:plans)
            render_remix(plan,source,(staging/(std::string("export.")+strategy_name(plan.strategy))).string(),block,stems,control);
        control.check();
        std::ofstream complete(staged(suffixes.size()-1));
        complete.imbue(std::locale::classic());
        complete<<"{\n  \"schema_version\": \"1.0-export\",\n  \"status\": \"complete\",\n  \"source_sha256\": \""
                <<source.sha256<<"\"";
        if (imported) {
            complete<<",\n  \"planning\": {\"mode\": \""<<(imported->plan?"imported":"fallback")<<"\", \"candidate_sha256\": ";
            if (imported->candidate_sha256.empty()) complete<<"null";
            else complete<<'"'<<imported->candidate_sha256<<'"';
            complete<<'}';
        }
        complete<<",\n  \"artifacts\": [\n";
        for (std::size_t i=0;i+1<suffixes.size();++i) {
            control.check();
            std::ifstream file(staged(i),std::ios::binary);
            const std::vector<std::uint8_t> bytes((std::istreambuf_iterator<char>(file)),{});
            if (!file || bytes.size()!=fs::file_size(staged(i))) throw std::runtime_error("cannot verify staged export");
            complete<<(i?",\n":"")<<"    {\"suffix\": \""<<suffixes[i]<<"\", \"bytes\": "<<bytes.size()
                    <<", \"sha256\": \""<<sha256(bytes)<<"\"}";
        }
        complete<<"\n  ]\n}\n";complete.close();
        if (!complete) throw std::runtime_error("cannot close export completion record");
        // Exclusive links preserve existing files; the completion record commits the set last.
        for (std::size_t i=0;i<suffixes.size();++i) {
            control.check();
            fs::create_hard_link(staged(i),output+suffixes[i]);
            published.push_back(i);
        }
    } catch (...) {
        std::error_code error;
        for (auto i:published)
            if (fs::equivalent(staged(i),output+suffixes[i],error)) fs::remove(output+suffixes[i],error);
        clean_stage();
        throw;
    }
    clean_stage();
}
} // namespace djayvo

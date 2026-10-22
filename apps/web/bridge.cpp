#include "jamloom/remix.h"
#include "jamloom/taste.h"
#include <string>

extern "C" const char* jamloom_web_taste(unsigned seed, unsigned tempo, unsigned energy,
                                        unsigned instruments, unsigned novelty, unsigned seconds, unsigned direction) {
    static std::string error;
    error.clear();
    try {
        jamloom::render_taste(jamloom::make_taste(seed,tempo,energy,instruments,novelty,seconds,direction),"/taste");
    } catch (const std::exception& e) { error=e.what(); }
      catch (...) { error="Unable to render this composition."; }
    return error.c_str();
}

// A fresh worker owns its entire in-memory filesystem. Nothing is published to
// the UI until every style succeeds; terminating that worker cancels the set.
// MEMFS has no hard links, so the native remix_file publication layer cannot run.
extern "C" const char* jamloom_web_render_duration(unsigned seed, unsigned direction, unsigned permission,unsigned seconds) {
    static std::string error;
    error.clear();
    try {
        if (direction > 4 || (permission != 1 && permission != 2) || (seconds && (seconds<15 || seconds>60)))
            throw std::invalid_argument("Confirm permission before making music.");
        const auto original = jamloom::read_wav("/input.wav");
        if (original.original_frames < original.original_rate * (seconds?1ULL:2ULL) ||
            original.original_frames > original.original_rate * (seconds?15ULL:5ULL))
            throw std::invalid_argument("Recording duration is outside the selected arrangement limits.");
        const auto source = jamloom::resample(original, 48000);
        const auto analysis = jamloom::analyze(source);
        const auto styles = direction == 4 ? std::vector<jamloom::Strategy>{jamloom::Strategy::hybrid}
            : direction == 3 ? std::vector<jamloom::Strategy>{jamloom::Strategy::call_response}
            : direction == 2 ? std::vector<jamloom::Strategy>{jamloom::Strategy::funk}
            : direction == 1 ? std::vector<jamloom::Strategy>{jamloom::Strategy::club}
            : std::vector<jamloom::Strategy>{jamloom::Strategy::hiphop,
                jamloom::Strategy::reggae, jamloom::Strategy::experimental};
        for (auto style : styles) {
            const auto plan = jamloom::make_remix(source, analysis, style, seed, permission == 2, permission == 1,nullptr,seconds);
            jamloom::render_remix(plan, source, std::string("/mix.") + jamloom::strategy_name(style));
        }
    } catch (const std::exception& e) { error = e.what(); }
      catch (...) { error = "The music engine could not finish. Try again."; }
    return error.c_str();
}

extern "C" const char* jamloom_web_render(unsigned seed,unsigned direction,unsigned permission){
    return jamloom_web_render_duration(seed,direction,permission,0);
}

// Session generation uses the same validated planner and renderer in a worker.
extern "C" const char* jamloom_web_session_mode(unsigned seed, unsigned tempo, unsigned tonic, unsigned mode, unsigned permission) {
    static std::string error;
    error.clear();
    try {
        if (permission != 1) throw std::invalid_argument("Confirm recording permission.");
        const auto source=jamloom::resample(jamloom::read_wav("/input.wav"),48000);
        if (mode>1) throw std::invalid_argument("Invalid context mode.");
        const jamloom::MusicalContext context{tempo,static_cast<int>(tonic),static_cast<jamloom::KeyMode>(mode)};
        const auto plan=jamloom::make_remix(source,jamloom::analyze(source),jamloom::Strategy::call_response,
                                          seed,false,true,&context);
        jamloom::render_remix(plan,source,"/mix.call_response");
    } catch (const std::exception& e) { error=e.what(); }
      catch (...) { error="Session generation failed."; }
    return error.c_str();
}

// Preserve callers of the original minor-only entry point.
extern "C" const char* jamloom_web_session(unsigned seed, unsigned tempo, unsigned tonic, unsigned permission) {
    return jamloom_web_session_mode(seed,tempo,tonic,0,permission);
}

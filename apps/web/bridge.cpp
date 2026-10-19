#include "djayvo/remix.h"
#include <string>

// A fresh worker owns its entire in-memory filesystem. Nothing is published to
// the UI until every style succeeds; terminating that worker cancels the set.
// MEMFS has no hard links, so the native remix_file publication layer cannot run.
extern "C" const char* djayvo_web_render(unsigned seed, unsigned direction, unsigned permission) {
    static std::string error;
    error.clear();
    try {
        if (direction > 4 || (permission != 1 && permission != 2))
            throw std::invalid_argument("Confirm permission before making music.");
        const auto original = djayvo::read_wav("/input.wav");
        if (original.original_frames < original.original_rate * 2ULL ||
            original.original_frames > original.original_rate * 5ULL)
            throw std::invalid_argument("Choose a 2–5 second recording.");
        const auto source = djayvo::resample(original, 48000);
        const auto analysis = djayvo::analyze(source);
        const auto styles = direction == 4 ? std::vector<djayvo::Strategy>{djayvo::Strategy::hybrid}
            : direction == 3 ? std::vector<djayvo::Strategy>{djayvo::Strategy::call_response}
            : direction == 2 ? std::vector<djayvo::Strategy>{djayvo::Strategy::funk}
            : direction == 1 ? std::vector<djayvo::Strategy>{djayvo::Strategy::club}
            : std::vector<djayvo::Strategy>{djayvo::Strategy::hiphop,
                djayvo::Strategy::reggae, djayvo::Strategy::experimental};
        for (auto style : styles) {
            const auto plan = djayvo::make_remix(source, analysis, style, seed, permission == 2, permission == 1);
            djayvo::render_remix(plan, source, std::string("/mix.") + djayvo::strategy_name(style));
        }
    } catch (const std::exception& e) { error = e.what(); }
      catch (...) { error = "The music engine could not finish. Try again."; }
    return error.c_str();
}

// Session generation uses the same validated planner and renderer in a worker.
extern "C" const char* djayvo_web_session(unsigned seed, unsigned tempo, unsigned tonic, unsigned permission) {
    static std::string error;
    error.clear();
    try {
        if (permission != 1) throw std::invalid_argument("Confirm recording permission.");
        const auto source=djayvo::resample(djayvo::read_wav("/input.wav"),48000);
        const djayvo::MusicalContext context{tempo,static_cast<int>(tonic)};
        const auto plan=djayvo::make_remix(source,djayvo::analyze(source),djayvo::Strategy::call_response,
                                          seed,false,true,&context);
        djayvo::render_remix(plan,source,"/mix.call_response");
    } catch (const std::exception& e) { error=e.what(); }
      catch (...) { error="Session generation failed."; }
    return error.c_str();
}

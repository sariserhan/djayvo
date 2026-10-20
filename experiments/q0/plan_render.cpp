#include "jamloom/remix.h"
#include "plan_import.h"
#include <filesystem>
#include <iostream>

// Offline probe: the Python harness owns a fresh directory. WebAssembly has
// no hard-link publication; use the same low-level writer as the web bridge.
int main(int argc, char** argv) {
    try {
        if (argc != 6 || std::string(argv[5]) != "--consent")
            throw std::invalid_argument("Expected input, plan, style, prefix, --consent");
        const auto source = jamloom::resample(jamloom::read_wav(argv[1]), 48000);
        for (auto style : {jamloom::Strategy::hiphop, jamloom::Strategy::reggae,
                           jamloom::Strategy::experimental}) {
            if (std::string(argv[3]) != jamloom::strategy_name(style)) continue;
            const std::string prefix = argv[4];
            for (const auto suffix : {".wav", ".score.json", ".events.tsv", ".report.json"})
                if (std::filesystem::exists(prefix + suffix))
                    throw std::invalid_argument("Refusing to replace an existing export");
            const auto plan = import_plan(read_plan_document(argv[2]), source, style, 4123, false, true);
            jamloom::render_remix(plan, source, prefix);
            return 0;
        }
        throw std::invalid_argument("Unsupported trial style");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}

#include "djayvo/remix.h"
#include <filesystem>
#include <stdexcept>

namespace djayvo {
void remix_file(const std::string& input,const std::string& output,const std::vector<Strategy>& strategies,
                 std::uint32_t rate,std::uint32_t seed,std::size_t block,bool synthetic,bool consent,bool stems) {
    if (input.empty() || output.empty() || synthetic==consent || !block || block>65536 ||
        strategies.empty() || strategies.size()>4)
        throw std::invalid_argument("supply bounded options and exactly one source permission kind");
    const auto original=read_wav(input);
    if (original.original_frames<original.original_rate*2ULL || original.original_frames>original.original_rate*5ULL)
        throw std::invalid_argument("supply a 2..5 second input recording");
    const auto source=resample(original,rate);
    const auto analysis=analyze(source);
    std::vector<RemixPlan> plans;
    for (auto s:strategies) plans.push_back(make_remix(source,analysis,s,seed,synthetic,consent));
    // Preflight every target before writing any file, including aliases of the input.
    for (const auto& plan:plans) {
        const auto prefix=output+"."+strategy_name(plan.strategy);
        std::vector<std::string> paths{prefix+".wav",prefix+".score.json",prefix+".report.json",prefix+".events.tsv"};
        if (stems) for (const auto* stem:{"piano","bass","drums","vocals"}) paths.push_back(prefix+"."+stem+".wav");
        for (const auto& path:paths) {
            if (std::filesystem::weakly_canonical(input)==std::filesystem::weakly_canonical(path) ||
                (std::filesystem::exists(path) && std::filesystem::equivalent(input,path)))
                throw std::invalid_argument("output cannot overwrite source recording");
        }
    }
    const auto parent=std::filesystem::path(output).parent_path();
    if (!parent.empty()) std::filesystem::create_directories(parent);
    for (const auto& plan:plans) render_remix(plan,source,output+"."+strategy_name(plan.strategy),block,stems);
}
} // namespace djayvo

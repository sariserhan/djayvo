#include "djayvo/remix.h"
#include <filesystem>
#include <iostream>

// Local plan audit of the previously cleared cohort; no source/audio is written.
int main(int argc,char** argv) {
    try {
        if (argc<3 || !std::filesystem::create_directory(argv[1]))
            throw std::runtime_error("provide a fresh output directory and cleared WAV paths");
        for (int i=2;i<argc;++i) {
            const auto source=djayvo::resample(djayvo::read_wav(argv[i]),48000);
            const auto analysis=djayvo::analyze(source);
            for (const auto style:{djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental,
                                  djayvo::Strategy::club,djayvo::Strategy::funk,djayvo::Strategy::call_response,djayvo::Strategy::hybrid}) {
                const auto plan=djayvo::make_remix(source,analysis,style,4123,false,true);
                const auto path=std::filesystem::path(argv[1])/(std::filesystem::path(argv[i]).stem().string()+"."+djayvo::strategy_name(style)+".score.json");
                djayvo::write_score(plan,source,path.string());
            }
        }
    } catch (const std::exception& e) { std::cerr<<e.what()<<'\n';return 1; }
}

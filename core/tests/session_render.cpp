#include "djayvo/remix.h"
#include "djayvo/session.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <utility>
int main(int argc,char** argv) {
    try {
        if (argc!=4 || std::string(argv[3])!="--consent")
            throw std::runtime_error("Usage: djayvo_session_render input.wav NEW_OUTPUT_DIRECTORY --consent");
        const auto source=djayvo::resample(djayvo::read_wav(argv[1]),48000);
        const auto analysis=djayvo::analyze(source);
        if (!std::filesystem::create_directory(argv[2])) throw std::runtime_error("output must be new");
        for (const auto [tempo,key] : {std::pair<unsigned,int>{60000,60},{83920,63},{120000,66},{180000,71}}) {
          for (auto mode : {djayvo::KeyMode::minor,djayvo::KeyMode::major}) {
            const djayvo::MusicalContext context{tempo,mode==djayvo::KeyMode::major?key:60,mode};
            const auto plan=djayvo::make_remix(source,analysis,djayvo::Strategy::call_response,4123,false,true,&context);
            djayvo::render_remix(plan,source,std::string(argv[2])+(mode==djayvo::KeyMode::major?"/session-major-":"/session-")+std::to_string(tempo));
          }
        }
        std::ofstream grid(std::string(argv[2])+"/grid.tsv");
        for (unsigned rate : {44100U,48000U,96000U}) for (unsigned tempo : {60000U,83920U,127190U,180000U})
            grid<<rate<<'\t'<<tempo<<'\t'<<static_cast<std::uint64_t>(djayvo_next_bar(rate*21600.0,17,rate,tempo))<<'\n';
        if (!grid) throw std::runtime_error("could not save grid");
        std::cout<<"PASS: eight validated major/minor context performances and six-hour grid receipt\n";
    } catch(const std::exception& error) { std::cerr<<error.what()<<'\n'; return 1; }
}

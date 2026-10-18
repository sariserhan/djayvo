#include "djayvo/remix.h"
#include <charconv>
#include <filesystem>
#include <iostream>
#include <stdexcept>

namespace {
std::uint32_t number(const std::string& text) {
    std::uint32_t result=0;
    const auto p=std::from_chars(text.data(),text.data()+text.size(),result);
    if (p.ec!=std::errc{} || p.ptr!=text.data()+text.size()) throw std::invalid_argument("expected unsigned integer");
    return result;
}
}
int main(int argc,char** argv) {
    try {
        std::string input,output="renders/remix",style="all";
        std::uint32_t rate=48000,seed=4123,block=512;
        bool consent=false,synthetic=false,stems=false;
        for (int i=1;i<argc;++i) {
            const std::string arg=argv[i];
            if (arg=="--help") {
                std::cout<<"Djayvo offline source-driven remix\nUsage: djayvo_remix --input FILE "
                         <<"[--consent | --synthetic-fixture] [--output PREFIX] "
                         <<"[--style all|hiphop|reggae|experimental|baseline] [--stems] "
                         <<"[--seed UINT32] [--sample-rate 8000..192000] [--block-size 1..65536]\n"
                         <<"--consent confirms permission to process the supplied recording locally.\n"
                         <<"--synthetic-fixture is only for generated non-person recordings.\n";
                return 0;
            }
            if (arg=="--consent") {consent=true;continue;}
            if (arg=="--synthetic-fixture") {synthetic=true;continue;}
            if (arg=="--stems") {stems=true;continue;}
            if (i+1>=argc) throw std::invalid_argument("missing value for "+arg);
            const std::string value=argv[++i];
            if (arg=="--input") input=value;
            else if (arg=="--output") output=value;
            else if (arg=="--style") style=value;
            else if (arg=="--seed") seed=number(value);
            else if (arg=="--sample-rate") rate=number(value);
            else if (arg=="--block-size") block=number(value);
            else throw std::invalid_argument("unknown option: "+arg);
        }
        if (input.empty() || output.empty() || (!consent && !synthetic) || (consent && synthetic))
            throw std::invalid_argument("supply input/output and exactly one of --consent or --synthetic-fixture");
        if (!block || block>65536) throw std::invalid_argument("block size outside 1..65536");
        std::vector<djayvo::Strategy> strategies;
        for (auto s : {djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental})
            if (style=="all" || style==djayvo::strategy_name(s)) strategies.push_back(s);
        if (style=="baseline") strategies.push_back(djayvo::Strategy::baseline);
        if (strategies.empty()) throw std::invalid_argument("unknown style");
        djayvo::remix_file(input,output,strategies,rate,seed,block,synthetic,consent,stems);
        for (const auto strategy:strategies)
            std::cout<<"PASS: "<<output<<'.'<<djayvo::strategy_name(strategy)<<".wav\n";
        std::cout<<"Listening/recognizability: NOT RUN\n";
        return 0;
    } catch (const std::exception& e) {std::cerr<<"FAIL: "<<e.what()<<'\n';return 1;}
}

#include "djayvo/remix.h"
#include "plan_import.h"
#include <charconv>
#include <csignal>
#include <filesystem>
#include <iostream>
#include <optional>
#include <stdexcept>

namespace {
volatile std::sig_atomic_t interrupted=0;
void interrupt(int) { interrupted=1; }
int cancelled(void*) { return interrupted!=0; }
std::uint32_t number(const std::string& text) {
    std::uint32_t result=0;
    const auto p=std::from_chars(text.data(),text.data()+text.size(),result);
    if (p.ec!=std::errc{} || p.ptr!=text.data()+text.size()) throw std::invalid_argument("expected unsigned integer");
    return result;
}
}
int main(int argc,char** argv) {
    try {
        std::string input,output="renders/remix",style="all",plan_path;
        std::uint32_t rate=48000,seed=4123,block=512;
        bool consent=false,synthetic=false,stems=false,fallback=false;
        for (int i=1;i<argc;++i) {
            const std::string arg=argv[i];
            if (arg=="--help") {
                std::cout<<"Djayvo offline source-driven remix\nUsage: djayvo_remix --input FILE "
                         <<"[--consent | --synthetic-fixture] [--output PREFIX] "
                         <<"[--style all|hiphop|reggae|experimental|baseline|club|funk] [--stems] "
                         <<"[--seed UINT32] [--sample-rate 8000..192000] [--block-size 1..65536]\n"
                         <<"[--plan FILE [--plan-fallback]] imports one bounded 1.0–1.3 remix score.\n"
                         <<"Plan requires one --style and matching seed/rate/source; no model is invoked.\n"
                         <<"Invalid plans fail unless --plan-fallback explicitly selects the rule planner.\n"
                         <<"--consent confirms permission to process the supplied recording locally.\n"
                         <<"--synthetic-fixture is only for generated non-person recordings.\n"
                         <<"Choose a new output prefix; existing files are never replaced.\n"
                         <<"Ctrl-C cancels safely. Require PREFIX.complete.json before consuming an export.\n";
                return 0;
            }
            if (arg=="--consent") {consent=true;continue;}
            if (arg=="--synthetic-fixture") {synthetic=true;continue;}
            if (arg=="--stems") {stems=true;continue;}
            if (arg=="--plan-fallback") {fallback=true;continue;}
            if (i+1>=argc) throw std::invalid_argument("missing value for "+arg);
            const std::string value=argv[++i];
            if (arg=="--input") input=value;
            else if (arg=="--output") output=value;
            else if (arg=="--style") style=value;
            else if (arg=="--seed") seed=number(value);
            else if (arg=="--sample-rate") rate=number(value);
            else if (arg=="--block-size") block=number(value);
            else if (arg=="--plan") plan_path=value;
            else throw std::invalid_argument("unknown option: "+arg);
        }
        if (input.empty() || output.empty() || (!consent && !synthetic) || (consent && synthetic))
            throw std::invalid_argument("supply input/output and exactly one of --consent or --synthetic-fixture");
        if (!block || block>65536) throw std::invalid_argument("block size outside 1..65536");
        std::vector<djayvo::Strategy> strategies;
        for (auto s : {djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental})
            if (style=="all" || style==djayvo::strategy_name(s)) strategies.push_back(s);
        if (style=="baseline") strategies.push_back(djayvo::Strategy::baseline);
        if (style=="club") strategies.push_back(djayvo::Strategy::club);
        if (style=="funk") strategies.push_back(djayvo::Strategy::funk);
        if (strategies.empty()) throw std::invalid_argument("unknown style");
        if ((fallback && plan_path.empty()) || (!plan_path.empty() && strategies.size()!=1))
            throw std::invalid_argument("plan import requires one explicit style; fallback requires --plan");
        std::signal(SIGINT,interrupt);std::signal(SIGTERM,interrupt);
        std::optional<djayvo::RemixPlan> plan;
        djayvo::PlanImport receipt;
        if (!plan_path.empty()) {
            const auto source=djayvo::resample(djayvo::read_wav(input),rate);
            try {
                const auto text=read_plan_document(plan_path);
                receipt.candidate_sha256=djayvo::sha256(std::vector<std::uint8_t>(text.begin(),text.end()));
                plan=import_plan(text,source,strategies[0],seed,synthetic,consent);
                receipt.plan=&*plan;
            } catch (const std::invalid_argument& e) {
                if (!fallback) throw;
                std::cerr<<"PARTIAL: candidate plan rejected ("<<e.what()<<"); using deterministic rule fallback\n";
            }
        }
        djayvo::remix_file(input,output,strategies,rate,seed,block,synthetic,consent,stems,{cancelled,nullptr},
                          plan_path.empty()?nullptr:&receipt);
        for (const auto strategy:strategies)
            std::cout<<"PASS: "<<output<<'.'<<djayvo::strategy_name(strategy)<<".wav\n";
        std::cout<<"PASS: complete export "<<output<<".complete.json\nListening/recognizability: NOT RUN\n";
        return 0;
    } catch (const djayvo::RenderCancelled& e) {std::cerr<<"PARTIAL: "<<e.what()<<'\n';return 130;}
      catch (const std::exception& e) {std::cerr<<"FAIL: "<<e.what()<<'\n';return 1;}
}

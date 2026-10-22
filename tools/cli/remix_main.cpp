#include "jamloom/remix.h"
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
        std::uint32_t rate=48000,seed=4123,block=512,duration=0;
        bool consent=false,synthetic=false,stems=false,fallback=false;
        for (int i=1;i<argc;++i) {
            const std::string arg=argv[i];
            if (arg=="--help") {
                std::cout<<"Jamloom offline source-driven remix\nUsage: jamloom_remix --input FILE "
                         <<"[--consent | --synthetic-fixture] [--output PREFIX] "
                         <<"[--style all|hiphop|reggae|experimental|baseline|club|funk|call_response|hybrid] [--stems] "
                         <<"[--seed UINT32] [--sample-rate 8000..192000] [--block-size 1..65536]\n"
                         <<"[--duration-seconds 15..60] enables 1..15-second sources and a custom-length arrangement.\n"
                         <<"[--plan FILE [--plan-fallback]] imports one bounded 1.0–1.8 remix score.\n"
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
            else if (arg=="--duration-seconds") { duration=number(value); if(duration<15 || duration>60) throw std::invalid_argument("duration must be 15..60 seconds"); }
            else if (arg=="--plan") plan_path=value;
            else throw std::invalid_argument("unknown option: "+arg);
        }
        if (input.empty() || output.empty() || (!consent && !synthetic) || (consent && synthetic))
            throw std::invalid_argument("supply input/output and exactly one of --consent or --synthetic-fixture");
        if (!block || block>65536) throw std::invalid_argument("block size outside 1..65536");
        std::vector<jamloom::Strategy> strategies;
        for (auto s : {jamloom::Strategy::hiphop,jamloom::Strategy::reggae,jamloom::Strategy::experimental})
            if (style=="all" || style==jamloom::strategy_name(s)) strategies.push_back(s);
        if (style=="baseline") strategies.push_back(jamloom::Strategy::baseline);
        if (style=="club") strategies.push_back(jamloom::Strategy::club);
        for (auto s : {jamloom::Strategy::funk,jamloom::Strategy::call_response,jamloom::Strategy::hybrid})
            if (style==jamloom::strategy_name(s)) strategies.push_back(s);
        if (strategies.empty()) throw std::invalid_argument("unknown style");
        if ((fallback && plan_path.empty()) || (!plan_path.empty() && strategies.size()!=1))
            throw std::invalid_argument("plan import requires one explicit style; fallback requires --plan");
        std::signal(SIGINT,interrupt);std::signal(SIGTERM,interrupt);
        std::optional<jamloom::RemixPlan> plan;
        jamloom::PlanImport receipt;
        if (!plan_path.empty()) {
            const auto source=jamloom::resample(jamloom::read_wav(input),rate);
            try {
                const auto text=read_plan_document(plan_path);
                receipt.candidate_sha256=jamloom::sha256(std::vector<std::uint8_t>(text.begin(),text.end()));
                plan=import_plan(text,source,strategies[0],seed,synthetic,consent);
                receipt.plan=&*plan;
            } catch (const std::invalid_argument& e) {
                if (!fallback) throw;
                std::cerr<<"PARTIAL: candidate plan rejected ("<<e.what()<<"); using deterministic rule fallback\n";
            }
        }
        jamloom::remix_file(input,output,strategies,rate,seed,block,synthetic,consent,stems,{cancelled,nullptr},
                          plan_path.empty()?nullptr:&receipt,duration);
        for (const auto strategy:strategies)
            std::cout<<"PASS: "<<output<<'.'<<jamloom::strategy_name(strategy)<<".wav\n";
        std::cout<<"PASS: complete export "<<output<<".complete.json\nListening/recognizability: NOT RUN\n";
        return 0;
    } catch (const jamloom::RenderCancelled& e) {std::cerr<<"PARTIAL: "<<e.what()<<'\n';return 130;}
      catch (const std::exception& e) {std::cerr<<"FAIL: "<<e.what()<<'\n';return 1;}
}

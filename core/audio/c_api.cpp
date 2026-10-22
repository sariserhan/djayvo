#include "jamloom/jamloom_c.h"
#include "jamloom/remix.h"
#include "jamloom/taste.h"
#include <filesystem>
#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace {
void error_text(char* output,std::size_t size,const char* text) noexcept {
    if (!output || !size) return;
    const auto count=std::min(size-1,std::strlen(text));
    std::memcpy(output,text,count);output[count]='\0';
}
}
extern "C" std::uint32_t jamloom_abi_version(void) {return JAMLOOM_ABI_VERSION;}
extern "C" int jamloom_render_file(const JamloomRenderOptions* options,char* error,std::size_t capacity) {
    return jamloom_render_file_cancellable(options,nullptr,nullptr,error,capacity);
}
extern "C" int jamloom_render_file_cancellable(const JamloomRenderOptions* options,
    JamloomCancelCheck cancelled,void* context,char* error,std::size_t capacity) {
    return jamloom_render_file_duration(options,0,cancelled,context,error,capacity);
}
extern "C" int jamloom_render_file_duration(const JamloomRenderOptions* options,std::uint32_t seconds,
    JamloomCancelCheck cancelled,void* context,char* error,std::size_t capacity) {
    error_text(error,capacity,"");
    try {
        if (!options || options->struct_size!=sizeof(JamloomRenderOptions) ||
            options->abi_version!=JAMLOOM_ABI_VERSION || !options->input_path || !options->output_prefix ||
            options->strategy>8 || (options->flags & ~(JAMLOOM_CONSENT|JAMLOOM_SYNTHETIC_FIXTURE|JAMLOOM_STEMS)))
            throw std::invalid_argument("invalid Jamloom ABI options");
        std::vector<jamloom::Strategy> strategies;
        if (options->strategy==0) strategies={jamloom::Strategy::hiphop,jamloom::Strategy::reggae,jamloom::Strategy::experimental};
        else strategies.push_back(static_cast<jamloom::Strategy>(options->strategy-1));
        jamloom::remix_file(options->input_path,options->output_prefix,strategies,options->sample_rate,
            options->seed,options->block_size,(options->flags&JAMLOOM_SYNTHETIC_FIXTURE)!=0,
            (options->flags&JAMLOOM_CONSENT)!=0,(options->flags&JAMLOOM_STEMS)!=0,{cancelled,context},nullptr,seconds);
        return 0;
    } catch (const jamloom::RenderCancelled& e) {error_text(error,capacity,e.what());return 4;}
      catch (const std::invalid_argument& e) {error_text(error,capacity,e.what());return 1;}
      catch (const std::exception& e) {error_text(error,capacity,e.what());return 2;}
      catch (...) {error_text(error,capacity,"unknown native render error");return 3;}
}

extern "C" int jamloom_render_taste(const char* directory,std::uint32_t seed,std::uint32_t tempo,
    std::uint32_t energy,std::uint32_t instruments,std::uint32_t novelty,std::uint32_t seconds,
    std::uint32_t direction,JamloomCancelCheck cancelled,void* context,char* error,std::size_t capacity) {
    namespace fs=std::filesystem;
    error_text(error,capacity,"");
    try {
        if (!directory || !*directory) throw std::invalid_argument("missing composition directory");
        const auto plan=jamloom::make_taste(seed,tempo,energy,instruments,novelty,seconds,direction);
        const jamloom::RenderControl control{cancelled,context};
        control.check();
        if (!fs::create_directory(directory)) throw std::invalid_argument("composition directory already exists");
        try {
            jamloom::render_taste(plan,(fs::path(directory)/"music").string(),control);
            control.check();
        } catch (...) {
            std::error_code ignored;
            for (const auto* name:{"music.wav","music.score.json","music.report.json"}) fs::remove(fs::path(directory)/name,ignored);
            fs::remove(directory,ignored);
            throw;
        }
        return 0;
    } catch (const jamloom::RenderCancelled& e) {error_text(error,capacity,e.what());return 4;}
      catch (const std::invalid_argument& e) {error_text(error,capacity,e.what());return 1;}
      catch (const std::exception& e) {error_text(error,capacity,e.what());return 2;}
      catch (...) {error_text(error,capacity,"unknown composition error");return 3;}
}

#include "djayvo/djayvo_c.h"
#include "djayvo/remix.h"
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
extern "C" std::uint32_t djayvo_abi_version(void) {return DJAYVO_ABI_VERSION;}
extern "C" int djayvo_render_file(const DjayvoRenderOptions* options,char* error,std::size_t capacity) {
    return djayvo_render_file_cancellable(options,nullptr,nullptr,error,capacity);
}
extern "C" int djayvo_render_file_cancellable(const DjayvoRenderOptions* options,
    DjayvoCancelCheck cancelled,void* context,char* error,std::size_t capacity) {
    error_text(error,capacity,"");
    try {
        if (!options || options->struct_size!=sizeof(DjayvoRenderOptions) ||
            options->abi_version!=DJAYVO_ABI_VERSION || !options->input_path || !options->output_prefix ||
            options->strategy>5 || (options->flags & ~(DJAYVO_CONSENT|DJAYVO_SYNTHETIC_FIXTURE|DJAYVO_STEMS)))
            throw std::invalid_argument("invalid Djayvo ABI options");
        std::vector<djayvo::Strategy> strategies;
        if (options->strategy==0) strategies={djayvo::Strategy::hiphop,djayvo::Strategy::reggae,djayvo::Strategy::experimental};
        else strategies.push_back(static_cast<djayvo::Strategy>(options->strategy-1));
        djayvo::remix_file(options->input_path,options->output_prefix,strategies,options->sample_rate,
            options->seed,options->block_size,(options->flags&DJAYVO_SYNTHETIC_FIXTURE)!=0,
            (options->flags&DJAYVO_CONSENT)!=0,(options->flags&DJAYVO_STEMS)!=0,{cancelled,context});
        return 0;
    } catch (const djayvo::RenderCancelled& e) {error_text(error,capacity,e.what());return 4;}
      catch (const std::invalid_argument& e) {error_text(error,capacity,e.what());return 1;}
      catch (const std::exception& e) {error_text(error,capacity,e.what());return 2;}
      catch (...) {error_text(error,capacity,"unknown native render error");return 3;}
}

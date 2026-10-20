#ifndef JAMLOOM_C_H
#define JAMLOOM_C_H
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif

#define JAMLOOM_ABI_VERSION 1u
#define JAMLOOM_CONSENT 1u
#define JAMLOOM_SYNTHETIC_FIXTURE 2u
#define JAMLOOM_STEMS 4u

/* Stable scalar options; initialize struct_size and abi_version explicitly.
 * All strings/buffers are caller-owned and valid for the synchronous call.
 * strategy: 0 original three, 1 hiphop, 2 reggae, 3 experimental, 4 baseline, 5 club, 6 funk, 7 call_response, 8 hybrid.
 * Call on a worker thread: this is an offline operation, not an audio callback.
 */
typedef struct JamloomRenderOptions {
    uint32_t struct_size;
    uint32_t abi_version;
    const char* input_path;
    const char* output_prefix;
    uint32_t sample_rate;
    uint32_t seed;
    uint32_t block_size;
    uint32_t flags;
    uint32_t strategy;
} JamloomRenderOptions;

/* 0 success; 1 invalid options/input; 2 I/O/render error; 3 unknown exception.
 * Error text is bounded and NUL-terminated when capacity>0 and error!=NULL.
 * No C++ exception crosses this boundary. No memory is returned to the caller.
 */
int jamloom_render_file(const JamloomRenderOptions* options, char* error, size_t capacity);
/* Additive ABI: callback runs on the calling worker between render blocks and
 * publication steps. Return nonzero to cancel (result 4). Never throw from it.
 * Context remains caller-owned. A cancelled operation publishes no complete set.
 * Existing destinations are never replaced. Require PREFIX.complete.json before
 * consuming a new export; interruption may leave PREFIX.partial without it.
 */
typedef int (*JamloomCancelCheck)(void* context);
int jamloom_render_file_cancellable(const JamloomRenderOptions* options,
    JamloomCancelCheck cancelled, void* context, char* error, size_t capacity);
uint32_t jamloom_abi_version(void);

#ifdef __cplusplus
}
#endif
#endif

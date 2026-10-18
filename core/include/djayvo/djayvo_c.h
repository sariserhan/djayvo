#ifndef DJAYVO_C_H
#define DJAYVO_C_H
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif

#define DJAYVO_ABI_VERSION 1u
#define DJAYVO_CONSENT 1u
#define DJAYVO_SYNTHETIC_FIXTURE 2u
#define DJAYVO_STEMS 4u

/* Stable scalar options; initialize struct_size and abi_version explicitly.
 * All strings/buffers are caller-owned and valid for the synchronous call.
 * strategy: 0 all three, 1 hiphop, 2 reggae, 3 experimental, 4 baseline.
 * Call on a worker thread: this is an offline operation, not an audio callback.
 */
typedef struct DjayvoRenderOptions {
    uint32_t struct_size;
    uint32_t abi_version;
    const char* input_path;
    const char* output_prefix;
    uint32_t sample_rate;
    uint32_t seed;
    uint32_t block_size;
    uint32_t flags;
    uint32_t strategy;
} DjayvoRenderOptions;

/* 0 success; 1 invalid options/input; 2 I/O/render error; 3 unknown exception.
 * Error text is bounded and NUL-terminated when capacity>0 and error!=NULL.
 * No C++ exception crosses this boundary. No memory is returned to the caller.
 */
int djayvo_render_file(const DjayvoRenderOptions* options, char* error, size_t capacity);
uint32_t djayvo_abi_version(void);

#ifdef __cplusplus
}
#endif
#endif

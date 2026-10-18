#include "djayvo/djayvo_c.h"
#include <math.h>
#include <stdio.h>
#include <string.h>

static void u16(FILE* f, uint16_t n) {fputc(n & 255u,f);fputc((n >> 8u) & 255u,f);}
static void u32(FILE* f, uint32_t n) {u16(f,(uint16_t)n);u16(f,(uint16_t)(n >> 16u));}
static int cancel(void* context) {int* calls=(int*)context;return ++*calls>32;}
int main(int argc, char** argv) {
    char error[128];
    DjayvoRenderOptions options={0};
    if (argc!=3 || djayvo_abi_version()!=DJAYVO_ABI_VERSION) return 1;
    if (djayvo_render_file(NULL,error,sizeof(error))!=1 || error[0]=='\0') return 2;
    error[0]='x';
    if (djayvo_render_file(NULL,error,1)!=1 || error[0]!='\0') return 3;
    if (djayvo_render_file(NULL,NULL,0)!=1) return 4;
    FILE* f=fopen(argv[1],"wb");if(!f) return 5;
    fwrite("RIFF",1,4,f);u32(f,36+48000*2);fwrite("WAVEfmt ",1,8,f);
    u32(f,16);u16(f,1);u16(f,1);u32(f,16000);u32(f,32000);u16(f,2);u16(f,16);
    fwrite("data",1,4,f);u32(f,48000*2);
    for (unsigned i=0;i<48000;++i) {
        double env=i%6400<3200?sin(3.141592653589793*(i%6400)/3200):0;
        int16_t sample=(int16_t)(9000*env*env*sin(6.283185307179586*220*i/16000));
        u16(f,(uint16_t)sample);
    }
    if(fclose(f)) return 6;
    options.struct_size=sizeof(options);options.abi_version=DJAYVO_ABI_VERSION;
    options.input_path=argv[1];options.output_prefix=argv[2];options.sample_rate=16000;
    options.seed=4123;options.block_size=257;options.flags=DJAYVO_SYNTHETIC_FIXTURE;options.strategy=1;
    options.abi_version=2;
    if(djayvo_render_file(&options,error,sizeof(error))!=1) return 7;
    options.abi_version=DJAYVO_ABI_VERSION;
    int calls=0;
    if(djayvo_render_file_cancellable(&options,cancel,&calls,error,sizeof(error))!=4 || calls!=33) return 10;
    if(djayvo_render_file(&options,error,sizeof(error))!=0) {fprintf(stderr,"FAIL: %s\n",error);return 8;}
    if(error[0]!='\0') return 9;
    if(djayvo_render_file(&options,error,sizeof(error))!=1) return 11;
    const char* suffixes[]={".hiphop.wav",".hiphop.score.json",".hiphop.report.json",".hiphop.events.tsv",".complete.json"};
    for(unsigned i=0;i<5;++i) {
        char path[4096];
        if(snprintf(path,sizeof(path),"%s%s",argv[2],suffixes[i])>=(int)sizeof(path) || remove(path)) return 12;
    }
    options.strategy=6;
    if(djayvo_render_file(&options,error,sizeof(error))!=1) return 13;
    options.strategy=5;
    if(djayvo_render_file(&options,error,sizeof(error))!=0) {fprintf(stderr,"FAIL: %s\n",error);return 14;}
    const char* club[]={".club.wav",".club.score.json",".club.report.json",".club.events.tsv",".complete.json"};
    for(unsigned i=0;i<5;++i) {
        char path[4096];
        if(snprintf(path,sizeof(path),"%s%s",argv[2],club[i])>=(int)sizeof(path) || remove(path)) return 15;
    }
    puts("PASS: stable C ABI, bounded errors, cancellation, exclusive complete export and actual offline remix");
    return 0;
}

#import "LiveAudio.h"
#import <AVFoundation/AVFoundation.h>
#include <array>
#include <atomic>
#include <memory>
#include <cmath>
#include <algorithm>

namespace {
struct MicCapture {
    std::array<float,192000*4> pcm{};
    std::atomic<unsigned> frames{0};
    std::atomic<bool> accepting{true},invalid{false};
    double rate=0;
};
}
@implementation JLMicrophone {
    AVAudioEngine* _engine;
    std::shared_ptr<MicCapture> _capture;
    BOOL _tapped;
}
- (NSString*)start {
    [self clear];
    if([AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio]!=AVAuthorizationStatusAuthorized)return @"Allow microphone access in System Settings, then record again.";
    @try {
    _engine=[AVAudioEngine new];
    AVAudioInputNode* input=_engine.inputNode;
    AVAudioFormat* format=[input outputFormatForBus:0];
    if(!std::isfinite(format.sampleRate) || format.sampleRate<8000 || format.sampleRate>192000 || format.channelCount<1 || format.channelCount>2 || format.commonFormat!=AVAudioPCMFormatFloat32 || format.interleaved){[self clear];return @"Choose a mono or stereo microphone at 8–192 kHz.";}
    _capture=std::make_shared<MicCapture>();_capture->rate=format.sampleRate;
    const auto capture=_capture;
    // Tap only: the microphone is never connected to a monitoring/output node.
    [input installTapOnBus:0 bufferSize:1024 format:format block:^(AVAudioPCMBuffer* buffer,AVAudioTime*) {
        if(!capture->accepting.load())return;
        if(!buffer.floatChannelData || buffer.format.interleaved || buffer.format.sampleRate!=capture->rate || buffer.format.channelCount<1 || buffer.format.channelCount>2){capture->invalid.store(true);capture->accepting.store(false);return;}
        const unsigned channels=buffer.format.channelCount;float* const* data=buffer.floatChannelData;
        const unsigned at=capture->frames.load(),limit=unsigned(capture->rate*4);
        const unsigned n=std::min(unsigned(buffer.frameLength),limit-at);
        for(unsigned i=0;i<n;++i){double value=0;for(unsigned ch=0;ch<channels;++ch){double x=data[ch][i];value+=std::isfinite(x)?std::clamp(x,-1.,1.):0;}capture->pcm[at+i]=float(value/channels);}
        capture->frames.store(at+n,std::memory_order_release);
        if(at+n>=limit)capture->accepting.store(false);
    }];_tapped=YES;
    NSError* error=nil;if(![_engine startAndReturnError:&error]){[self clear];return @"Microphone could not start. Check permission and the selected input device.";}
    return nil;
    } @catch(NSException*) { [self clear];return @"Microphone became unavailable. Check the input device and record again."; }
}
- (void)stop {
    if(_capture)_capture->accepting.store(false);
    [_engine stop];if(_tapped){[_engine.inputNode removeTapOnBus:0];_tapped=NO;}_engine=nil;
}
- (void)clear { [self stop];_capture.reset(); }
- (void)dealloc { [self clear]; }
- (NSDictionary*)status {
    if(!_capture)return @{@"recording":@NO,@"frames":@0,@"sampleRate":@0,@"invalid":@NO};
    return @{@"recording":@(_capture->accepting.load() && _engine.running),@"frames":@(_capture->frames.load(std::memory_order_acquire)),@"sampleRate":@(_capture->rate),@"invalid":@(_capture->invalid.load())};
}
- (NSData*)sample {
    if(!_capture)return [NSData data];
    const auto count=_capture->frames.load(std::memory_order_acquire);
    return [NSData dataWithBytes:_capture->pcm.data() length:count*sizeof(float)];
}
@end

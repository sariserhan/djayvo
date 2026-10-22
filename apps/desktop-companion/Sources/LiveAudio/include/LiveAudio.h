#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface JLLiveAudio : NSObject
+ (NSArray<NSDictionary<NSString*,id>*>*)sources;
+ (NSArray<NSDictionary<NSString*,id>*>*)outputs;
- (nullable NSString*)startProcess:(uint32_t)process output:(uint32_t)output;
- (void)stop;
- (BOOL)setControls:(NSDictionary<NSString*,id>*)controls mixGain:(double)mixGain;
- (BOOL)loadSample:(NSData*)pcm sampleRate:(double)rate;
- (BOOL)playSample;
- (void)stopSample;
- (void)clearSample;
- (NSDictionary<NSString*,id>*)status;
@end

@interface JLMicrophone : NSObject
- (nullable NSString*)start;
- (void)stop;
- (void)clear;
- (NSDictionary<NSString*,id>*)status;
- (NSData*)sample;
@end
NS_ASSUME_NONNULL_END

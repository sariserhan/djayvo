#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface JLLiveAudio : NSObject
+ (NSArray<NSDictionary<NSString*,id>*>*)sources;
+ (NSArray<NSDictionary<NSString*,id>*>*)outputs;
- (nullable NSString*)startProcess:(uint32_t)process output:(uint32_t)output;
- (void)stop;
- (BOOL)setControls:(NSDictionary<NSString*,id>*)controls mixGain:(double)mixGain;
- (NSDictionary<NSString*,id>*)status;
@end
NS_ASSUME_NONNULL_END

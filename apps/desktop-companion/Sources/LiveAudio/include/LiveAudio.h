#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN
@interface JLLiveAudio : NSObject
+ (NSArray<NSDictionary<NSString*,id>*>*)sources;
+ (NSArray<NSDictionary<NSString*,id>*>*)outputs;
- (nullable NSString*)startProcess:(uint32_t)process output:(uint32_t)output;
- (void)stop;
- (BOOL)setLevel:(double)level low:(double)low mid:(double)mid high:(double)high tone:(double)tone echo:(double)echo bypass:(BOOL)bypass roll:(BOOL)roll percussion:(BOOL)percussion;
- (NSDictionary<NSString*,id>*)status;
@end
NS_ASSUME_NONNULL_END

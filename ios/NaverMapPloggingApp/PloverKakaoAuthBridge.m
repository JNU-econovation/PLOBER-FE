#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PloverKakaoAuthBridge, NSObject)

RCT_EXTERN_METHOD(initialize:(NSString *)appKey)

RCT_EXTERN_METHOD(login:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(logout:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

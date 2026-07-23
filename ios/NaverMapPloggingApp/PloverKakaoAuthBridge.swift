import Foundation
import KakaoSDKAuth
import KakaoSDKCommon
import KakaoSDKUser
import React

@objc(PloverKakaoAuthBridge)
class PloverKakaoAuthBridge: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(initialize:)
  func initialize(_ appKey: String) {
    DispatchQueue.main.async {
      KakaoSDK.initSDK(appKey: appKey)
    }
  }

  @objc(login:rejecter:)
  func login(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard (try? KakaoSDK.shared.appKey()) != nil else {
        reject("kakao_not_initialized", "Kakao SDK is not initialized.", nil)
        return
      }

      let callback = { (token: OAuthToken?, error: Error?) in
        if let error {
          if let sdkError = error as? SdkError,
             sdkError.isClientFailed,
             sdkError.getClientError().reason == .Cancelled {
            reject("kakao_login_canceled", "Kakao login was canceled.", error)
            return
          }

          reject("kakao_login_failed", error.localizedDescription, error)
          return
        }

        guard let token else {
          reject("kakao_login_failed", "Kakao SDK did not return a token.", nil)
          return
        }

        resolve([
          "accessToken": token.accessToken,
          "refreshToken": token.refreshToken,
          "tokenType": token.tokenType,
          "idToken": token.idToken as Any,
          "accessTokenExpiresAt": token.expiredAt.timeIntervalSince1970,
          "refreshTokenExpiresAt": token.refreshTokenExpiredAt.timeIntervalSince1970,
          "accessTokenExpiresIn": token.expiresIn,
          "refreshTokenExpiresIn": token.refreshTokenExpiresIn,
          "scopes": token.scopes ?? []
        ])
      }

      if UserApi.isKakaoTalkLoginAvailable() {
        UserApi.shared.loginWithKakaoTalk(completion: callback)
      } else {
        UserApi.shared.loginWithKakaoAccount(completion: callback)
      }
    }
  }

  @objc(logout:rejecter:)
  func logout(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard (try? KakaoSDK.shared.appKey()) != nil else {
        resolve(nil)
        return
      }

      UserApi.shared.logout { error in
        if let error {
          reject("kakao_logout_failed", error.localizedDescription, error)
        } else {
          resolve(nil)
        }
      }
    }
  }
}

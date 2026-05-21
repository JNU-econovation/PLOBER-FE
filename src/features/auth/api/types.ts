export type KakaoLoginRequest = {
  accessToken: string;
};

export type AppleLoginRequest = {
  identityToken: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  tokenType: string;
  userId: number;
  nickname: string;
  email: string;
};

export type KakaoLoginResponse = AuthLoginResponse;
export type AppleLoginResponse = AuthLoginResponse;

export type LogoutRequest = {
  userId: number;
};

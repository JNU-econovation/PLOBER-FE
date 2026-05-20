export type KakaoLoginRequest = {
  code: string;
};

export type AppleLoginRequest = {
  identityToken: string;
  name: string | null;
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

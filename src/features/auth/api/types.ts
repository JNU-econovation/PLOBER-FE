export type KakaoLoginRequest = {
  code: string;
};

export type KakaoLoginResponse = {
  accessToken: string;
  tokenType: string;
  userId: number;
  nickname: string;
  email: string;
};

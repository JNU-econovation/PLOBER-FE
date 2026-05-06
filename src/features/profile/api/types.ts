export type UserProfile = {
  nickname: string;
  level: number;
  profileImageUrl: string | null;
};

export type UpdateMyNicknameRequest = {
  nickname: string;
};

export type UpdateMyNicknameResponse = {
  userId: number;
  nickname: string;
};

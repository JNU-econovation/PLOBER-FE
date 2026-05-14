export type UserProfile = {
  nickname: string;
  level: number;
  title: string;
  profileImageUrl: string | null;
  experience: number;
};

export type GetMyPloggingStatsRequest = {
  userId: number;
};

export type MyPloggingStats = {
  totalPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
};

export type UpdateMyNicknameRequest = {
  nickname: string;
  userId: number;
};

export type UpdateMyNicknameResponse = {
  userId: number;
  nickname: string;
};

export type ProfileImageUploadContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif"
  | "image/avif";

export type GetProfileImageUploadUrlRequest = {
  contentType: ProfileImageUploadContentType;
  userId: number;
};

export type GetProfileImageUploadUrlResponse = {
  uploadUrl: string;
  objectUrl: string;
};

export type UpdateMyProfileImageRequest = {
  imageUrl: string;
  userId: number;
};

export type UpdateMyProfileImageResponse = {
  userId: number;
  profileImageUrl: string;
};

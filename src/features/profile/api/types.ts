export type UserProfile = {
  nickname: string;
  level: number;
  title: string;
  profileImageUrl: string | null;
  experience: number;
};

export type MyPloggingStats = {
  totalPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
};

export type UpdateMyNicknameRequest = {
  nickname: string;
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
};

export type GetProfileImageUploadUrlResponse = {
  uploadUrl: string;
  objectUrl: string;
};

export type UpdateMyProfileImageRequest = {
  imageUrl: string;
};

export type UpdateMyProfileImageResponse = {
  userId: number;
  profileImageUrl: string;
};

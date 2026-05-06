import { apiClient } from "@/src/shared/api";

import type {
  GetProfileImageUploadUrlRequest,
  GetProfileImageUploadUrlResponse,
} from "./types";

const PROFILE_IMAGE_UPLOAD_URL_PATH =
  "/api/users/me/profile-image/upload-url";

export async function getProfileImageUploadUrl(
  { contentType, userId }: GetProfileImageUploadUrlRequest
): Promise<GetProfileImageUploadUrlResponse> {
  const response = await apiClient.get<GetProfileImageUploadUrlResponse>(
    PROFILE_IMAGE_UPLOAD_URL_PATH,
    { params: { contentType, userId } }
  );
  return response.data;
}

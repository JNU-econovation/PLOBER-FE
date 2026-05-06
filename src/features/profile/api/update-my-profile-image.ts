import { apiClient } from "@/src/shared/api";

import type {
  UpdateMyProfileImageRequest,
  UpdateMyProfileImageResponse,
} from "./types";

const MY_PROFILE_IMAGE_PATH = "/api/users/me/profile-image";

export async function updateMyProfileImage(
  { imageUrl, userId }: UpdateMyProfileImageRequest
): Promise<UpdateMyProfileImageResponse> {
  const response = await apiClient.put<UpdateMyProfileImageResponse>(
    MY_PROFILE_IMAGE_PATH,
    { imageUrl },
    { params: { userId } }
  );
  return response.data;
}

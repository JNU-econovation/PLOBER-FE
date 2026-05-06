import { apiClient } from "@/src/shared/api";

import type {
  GetPhotoUploadUrlRequest,
  GetPhotoUploadUrlResponse,
} from "./types";

const PHOTO_UPLOAD_URL_PATH = "/api/plogging-sessions/photo/upload-url";

export async function getPhotoUploadUrl(
  params: GetPhotoUploadUrlRequest
): Promise<GetPhotoUploadUrlResponse> {
  const response = await apiClient.get<GetPhotoUploadUrlResponse>(
    PHOTO_UPLOAD_URL_PATH,
    { params }
  );
  return response.data;
}

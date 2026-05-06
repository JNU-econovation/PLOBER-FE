import { apiClient } from "@/src/shared/api";

import type {
  GetMapImageUploadUrlRequest,
  GetMapImageUploadUrlResponse,
} from "./types";

const MAP_IMAGE_UPLOAD_URL_PATH =
  "/api/plogging-sessions/map-image/upload-url";

export async function getMapImageUploadUrl(
  params: GetMapImageUploadUrlRequest
): Promise<GetMapImageUploadUrlResponse> {
  const response = await apiClient.get<GetMapImageUploadUrlResponse>(
    MAP_IMAGE_UPLOAD_URL_PATH,
    { params }
  );
  return response.data;
}

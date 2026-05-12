import { getMapImageUploadUrl } from "../api/get-map-image-upload-url";
import type { MapImageUploadContentType } from "../api/types";

export type UploadMapImageResult =
  | { status: "uploaded"; objectUrl: string }
  | { status: "error"; message: string };

const DEFAULT_CONTENT_TYPE: MapImageUploadContentType = "image/png";

export async function uploadMapImage(
  localUri: string,
  contentType: MapImageUploadContentType = DEFAULT_CONTENT_TYPE
): Promise<UploadMapImageResult> {
  try {
    if (__DEV__) {
      console.log("[plogging-map-upload] requesting upload URL", {
        contentType,
      });
    }

    const { uploadUrl, objectUrl } = await getMapImageUploadUrl({ contentType });

    const fileResponse = await fetch(localUri);
    if (!fileResponse.ok) {
      throw new Error(`로컬 파일 읽기 실패 (${fileResponse.status})`);
    }
    const blob = await fileResponse.blob();

    const putResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType },
    });

    if (!putResponse.ok) {
      throw new Error(`S3 업로드 실패 (${putResponse.status})`);
    }

    if (__DEV__) {
      console.log("[plogging-map-upload] uploaded", { objectUrl });
    }

    return { status: "uploaded", objectUrl };
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-map-upload] failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "지도 이미지 업로드 중 문제가 발생했습니다.",
    };
  }
}

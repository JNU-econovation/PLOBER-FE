import { getPhotoUploadUrl } from "../api/get-photo-upload-url";
import type { PhotoUploadContentType } from "../api/types";

export type UploadPloggingPhotoResult =
  | { status: "uploaded"; objectUrl: string }
  | { status: "error"; message: string };

const DEFAULT_CONTENT_TYPE: PhotoUploadContentType = "image/jpeg";

export async function uploadPloggingPhoto(
  localUri: string,
  contentType: PhotoUploadContentType = DEFAULT_CONTENT_TYPE
): Promise<UploadPloggingPhotoResult> {
  try {
    if (__DEV__) {
      console.log("[plogging-photo-upload] requesting upload URL", {
        contentType,
      });
    }

    const { uploadUrl, objectUrl } = await getPhotoUploadUrl({ contentType });

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
      console.log("[plogging-photo-upload] uploaded", { objectUrl });
    }

    return { status: "uploaded", objectUrl };
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-photo-upload] failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "인증샷 업로드 중 문제가 발생했습니다.",
    };
  }
}

import { getPhotoUploadUrl } from "../api/get-photo-upload-url";
import type { PhotoUploadContentType } from "../api/types";

export type UploadPloggingPhotoResult =
  | { status: "uploaded"; objectUrl: string }
  | { status: "error"; message: string };

const DEFAULT_CONTENT_TYPE: PhotoUploadContentType = "image/jpeg";
const uploadTasks = new Map<string, Promise<UploadPloggingPhotoResult>>();

export function uploadPloggingPhoto(
  localUri: string,
  contentType: PhotoUploadContentType = DEFAULT_CONTENT_TYPE
): Promise<UploadPloggingPhotoResult> {
  const existingTask = uploadTasks.get(localUri);
  if (existingTask) return existingTask;

  const task = performPloggingPhotoUpload(localUri, contentType);
  uploadTasks.set(localUri, task);
  void task.then((result) => {
    // 성공 결과는 리포트가 같은 URI로 조회할 수 있도록 유지하고,
    // 실패는 다음 호출에서 재시도할 수 있도록 제거한다.
    if (result.status === "error" && uploadTasks.get(localUri) === task) {
      uploadTasks.delete(localUri);
    }
  });
  return task;
}

async function performPloggingPhotoUpload(
  localUri: string,
  contentType: PhotoUploadContentType
): Promise<UploadPloggingPhotoResult> {
  try {
    if (__DEV__) {
      console.log("[plogging-photo-upload] requesting upload URL", {
        contentType,
      });
    }

    const { uploadUrl, objectUrl } = await getPhotoUploadUrl({
      contentType,
    });

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

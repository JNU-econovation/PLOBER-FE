import { getMapImageUploadUrl } from "../api/get-map-image-upload-url";
import type { MapImageUploadContentType } from "../api/types";

export type UploadMapImageResult =
  | { status: "uploaded"; objectUrl: string }
  | { status: "error"; message: string };

const DEFAULT_CONTENT_TYPE: MapImageUploadContentType = "image/png";
const MAP_IMAGE_UPLOAD_TIMEOUT_MS = 30_000;

export async function uploadMapImage(
  localUri: string,
  userId: number,
  contentType: MapImageUploadContentType = DEFAULT_CONTENT_TYPE
): Promise<UploadMapImageResult> {
  try {
    if (__DEV__) {
      console.log("[plogging-map-upload] requesting upload URL", {
        contentType,
      });
    }

    const { uploadUrl, objectUrl } = await getMapImageUploadUrl({
      contentType,
      userId,
    });

    const fileResponse = await fetchWithTimeout(
      localUri,
      undefined,
      "지도 이미지 파일을 읽는 시간이 초과되었습니다."
    );
    if (!fileResponse.ok) {
      throw new Error(`로컬 파일 읽기 실패 (${fileResponse.status})`);
    }
    const blob = await fileResponse.blob();
    if (blob.size === 0) {
      throw new Error("지도 이미지 파일이 비어 있습니다.");
    }

    const putResponse = await fetchWithTimeout(
      uploadUrl,
      {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentType },
      },
      "지도 이미지 업로드 시간이 초과되었습니다. 다시 시도해주세요."
    );

    if (!putResponse.ok) {
      const errorBody = await putResponse.text().catch(() => "");
      if (__DEV__) {
        console.log("[plogging-map-upload] upload failed", {
          body: errorBody,
          status: putResponse.status,
        });
      }
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

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  timeoutMessage: string
): Promise<Response> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, MAP_IMAGE_UPLOAD_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: abortController.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

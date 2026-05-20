import * as FileSystem from "expo-file-system/legacy";

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

    const uploadResponse = await uploadLocalImageFile({
      contentType,
      localUri,
      uploadUrl,
    });

    if (__DEV__) {
      console.log("[plogging-map-upload] uploaded", {
        objectUrl,
        status: uploadResponse.status,
      });
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

async function uploadLocalImageFile({
  contentType,
  localUri,
  uploadUrl,
}: {
  contentType: MapImageUploadContentType;
  localUri: string;
  uploadUrl: string;
}): Promise<FileSystem.FileSystemUploadResult> {
  const fileUri = normalizeLocalFileUri(localUri);
  const fileInfo = await FileSystem.getInfoAsync(fileUri);

  if (!fileInfo.exists) {
    throw new Error("지도 이미지 파일을 찾을 수 없습니다.");
  }
  if (fileInfo.isDirectory) {
    throw new Error("지도 이미지 경로가 파일이 아닙니다.");
  }
  if (fileInfo.size === 0) {
    throw new Error("지도 이미지 파일이 비어 있습니다.");
  }

  if (__DEV__) {
    console.log("[plogging-map-upload] local file ready", {
      fileSize: fileInfo.size,
      fileUri,
    });
  }

  const uploadResponse = await withTimeout(
    FileSystem.uploadAsync(uploadUrl, fileUri, {
      headers: { "Content-Type": contentType },
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    }),
    MAP_IMAGE_UPLOAD_TIMEOUT_MS,
    "지도 이미지 업로드 시간이 초과되었습니다. 다시 시도해주세요."
  );

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    if (__DEV__) {
      console.log("[plogging-map-upload] upload failed", {
        body: uploadResponse.body,
        status: uploadResponse.status,
      });
    }
    throw new Error(`S3 업로드 실패 (${uploadResponse.status})`);
  }

  return uploadResponse;
}

function normalizeLocalFileUri(uri: string): string {
  if (hasUriScheme(uri)) return uri;
  return `file://${uri}`;
}

function hasUriScheme(uri: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(uri);
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

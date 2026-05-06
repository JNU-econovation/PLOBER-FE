import type { ProfileImageUploadContentType } from "../api";

const MIME_TYPE_BY_EXTENSION: Record<string, ProfileImageUploadContentType> = {
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const ACCEPTED_CONTENT_TYPES = new Set<ProfileImageUploadContentType>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

const PROFILE_IMAGE_UPLOAD_TIMEOUT_MS = 30_000;

export function resolveProfileImageContentType({
  fileName,
  mimeType,
  uri,
}: {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
}): ProfileImageUploadContentType {
  if (
    mimeType &&
    ACCEPTED_CONTENT_TYPES.has(mimeType as ProfileImageUploadContentType)
  ) {
    return mimeType as ProfileImageUploadContentType;
  }

  const extensionSource = fileName ?? uri.split("?")[0];
  const extension = extensionSource.split(".").pop()?.toLowerCase();
  const resolvedContentType = extension
    ? MIME_TYPE_BY_EXTENSION[extension]
    : undefined;

  return resolvedContentType ?? "image/jpeg";
}

export async function uploadProfileImageToS3({
  contentType,
  uploadUrl,
  uri,
}: {
  contentType: ProfileImageUploadContentType;
  uploadUrl: string;
  uri: string;
}): Promise<void> {
  if (!uploadUrl) {
    throw new Error("프로필 이미지 업로드 URL을 받지 못했습니다.");
  }

  const imageResponse = await fetch(uri);
  if (!imageResponse.ok) {
    throw new Error("선택한 이미지를 읽지 못했습니다.");
  }

  const imageBlob = await imageResponse.blob();
  if (imageBlob.size === 0) {
    throw new Error("선택한 이미지 파일이 비어 있습니다.");
  }

  if (__DEV__) {
    console.log("[profile-image] upload start", {
      blobSize: imageBlob.size,
      contentType,
      blobType: imageBlob.type,
      uploadHost: new URL(uploadUrl).host,
    });
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, PROFILE_IMAGE_UPLOAD_TIMEOUT_MS);

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, {
      body: imageBlob,
      headers: {
        "Content-Type": contentType,
      },
      method: "PUT",
      signal: abortController.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "프로필 이미지 업로드 시간이 초과되었습니다. S3 업로드 URL 또는 CORS 설정을 확인해주세요."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => "");
    if (__DEV__) {
      console.log("[profile-image] upload failed", {
        body: errorBody,
        status: uploadResponse.status,
      });
    }

    throw new Error(
      `프로필 이미지 업로드에 실패했습니다. (${uploadResponse.status})`
    );
  }

  if (__DEV__) {
    console.log("[profile-image] upload success", {
      status: uploadResponse.status,
    });
  }
}

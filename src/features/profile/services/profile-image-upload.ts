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

  if (!resolvedContentType) {
    throw new Error("지원하지 않는 이미지 형식입니다.");
  }

  return resolvedContentType;
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
  const imageResponse = await fetch(uri);
  const imageBlob = await imageResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    body: imageBlob,
    headers: {
      "Content-Type": contentType,
    },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    throw new Error("프로필 이미지 업로드에 실패했습니다.");
  }
}

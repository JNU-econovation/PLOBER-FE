import { ApiError } from "@/src/shared/api";
import { getSession } from "@/src/shared/auth";
import { API_BASE_URL } from "@/src/shared/constants/env";

export type AnalyzeTrashPhotoInput = {
  localUri: string;
  contentType?: string;
  fileName?: string;
  latitude?: number;
  longitude?: number;
};

export type AnalyzeTrashPhotoResult =
  | { status: "accepted" }
  | { status: "error"; message: string };

const ANALYZE_TRASH_PHOTO_PATH = "/api/plogging/analyze";

export async function analyzeTrashPhoto({
  localUri,
  contentType = "image/jpeg",
  fileName,
  latitude,
  longitude,
}: AnalyzeTrashPhotoInput): Promise<AnalyzeTrashPhotoResult> {
  try {
    const formData = new FormData();
    formData.append("file", {
      name: fileName ?? `plogging-${Date.now()}${extensionFor(contentType)}`,
      type: contentType,
      uri: localUri,
    } as unknown as Blob);
    if (typeof latitude === "number") {
      formData.append("latitude", String(latitude));
    }
    if (typeof longitude === "number") {
      formData.append("longitude", String(longitude));
    }

    const session = await getSession();
    const headers: Record<string, string> = {};
    if (session?.accessToken) {
      headers.Authorization = `${session.tokenType} ${session.accessToken}`;
    }

    if (__DEV__) {
      console.log("[trash-photo-analysis] request", {
        contentType,
        fileName,
        hasAuthorization: Boolean(headers.Authorization),
        hasLatitude: typeof latitude === "number",
        hasLongitude: typeof longitude === "number",
      });
    }

    const response = await fetch(
      new URL(ANALYZE_TRASH_PHOTO_PATH, API_BASE_URL).toString(),
      {
        body: formData,
        headers,
        method: "POST",
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ApiError(
        errorText
          ? `사진 분석 요청 실패 (${response.status}): ${errorText}`
          : `사진 분석 요청 실패 (${response.status})`,
        {
        status: response.status,
          details: errorText,
        }
      );
    }

    return { status: "accepted" };
  } catch (error) {
    if (__DEV__) {
      console.log("[trash-photo-analysis] failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "쓰레기 사진 분석 요청에 실패했습니다.",
    };
  }
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/heic") return ".heic";
  if (contentType === "image/heif") return ".heif";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

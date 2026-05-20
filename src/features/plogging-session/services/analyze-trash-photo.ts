import { ApiError } from "@/src/shared/api";
import { getSession } from "@/src/shared/auth";
import { API_BASE_URL } from "@/src/shared/constants/env";

export type AnalyzeTrashPhotoInput = {
  localUri: string;
  contentType?: string;
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
  latitude,
  longitude,
}: AnalyzeTrashPhotoInput): Promise<AnalyzeTrashPhotoResult> {
  try {
    const formData = new FormData();
    formData.append("file", {
      name: `plogging-${Date.now()}.jpg`,
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

    const response = await fetch(
      new URL(ANALYZE_TRASH_PHOTO_PATH, API_BASE_URL).toString(),
      {
        body: formData,
        headers,
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new ApiError(`사진 분석 요청 실패 (${response.status})`, {
        status: response.status,
      });
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

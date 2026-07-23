import { apiClient } from "@/src/shared/api";

import type {
  UpdateMyNicknameRequest,
  UpdateMyNicknameResponse,
} from "./types";

const MY_NICKNAME_PATH = "/api/users/me/nickname";

export async function updateMyNickname(
  { nickname }: UpdateMyNicknameRequest
): Promise<UpdateMyNicknameResponse> {
  const response = await apiClient.put<UpdateMyNicknameResponse>(
    MY_NICKNAME_PATH,
    { nickname }
  );
  return response.data;
}

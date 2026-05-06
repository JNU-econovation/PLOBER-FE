import { apiClient } from "@/src/shared/api";

import type {
  UpdateMyNicknameRequest,
  UpdateMyNicknameResponse,
} from "./types";

const MY_NICKNAME_PATH = "/api/users/me/nickname";

export async function updateMyNickname(
  { nickname, userId }: UpdateMyNicknameRequest
): Promise<UpdateMyNicknameResponse> {
  const response = await apiClient.put<UpdateMyNicknameResponse>(
    MY_NICKNAME_PATH,
    { nickname },
    { params: { userId } }
  );
  return response.data;
}

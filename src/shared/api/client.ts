import axios from "axios";

import { API_BASE_URL } from "@/src/shared/constants/env";

import { attachInterceptors } from "./interceptors";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

attachInterceptors(apiClient);

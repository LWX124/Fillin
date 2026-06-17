import axios from "axios";
import { getClientLocale, localizedPath } from "@/i18n/locale";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers["Accept-Language"] = getClientLocale();
    }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const url = error.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (error.response?.status === 401 && typeof window !== "undefined" && !isAuthEndpoint) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh && !error.config._retry) {
        error.config._retry = true;
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = localizedPath("/login", getClientLocale());
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

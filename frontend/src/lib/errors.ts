import type { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations>;

type ApiErrorPayload = {
  code?: string;
  detail?: unknown;
};

function getPayload(error: unknown): ApiErrorPayload | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined;
  }

  const data = (error as { response?: { data?: ApiErrorPayload } }).response?.data;
  if (!data) return undefined;

  if (data.detail && typeof data.detail === "object" && !Array.isArray(data.detail)) {
    return data.detail as ApiErrorPayload;
  }

  return data;
}

export function getApiErrorMessage(error: unknown, t: Translator, fallbackKey = "UNKNOWN") {
  const payload = getPayload(error);
  if (payload?.code) {
    try {
      return t(payload.code);
    } catch {
      // Fall through to backend detail for unmapped error codes.
    }
  }

  return typeof payload?.detail === "string" ? payload.detail : t(fallbackKey);
}

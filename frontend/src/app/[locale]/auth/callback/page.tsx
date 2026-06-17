"use client";

import { Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";
import { AuthFrame } from "@/components/AppShell";
import { useRouter } from "@/i18n/navigation";

function CallbackHandler() {
  const router = useRouter();
  const t = useTranslations("auth");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      window.location.hash = "";
      router.push("/dashboard");
    } else {
      router.push("/login?error=oauth_failed");
    }
  }, [router]);

  return <div className="status-pill">{t("authenticating")}</div>;
}

export default function AuthCallbackPage() {
  const common = useTranslations("common");

  return (
    <AuthFrame>
      <div className="surface-panel rounded-3xl p-8 text-center">
        <Suspense fallback={<div className="status-pill">{common("loading")}</div>}>
          <CallbackHandler />
        </Suspense>
      </div>
    </AuthFrame>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/AppShell";

function CallbackHandler() {
  const router = useRouter();

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

  return <div className="status-pill">Authenticating</div>;
}

export default function AuthCallbackPage() {
  return (
    <AuthFrame>
      <div className="surface-panel rounded-3xl p-8 text-center">
        <Suspense fallback={<div className="status-pill">Loading</div>}>
          <CallbackHandler />
        </Suspense>
      </div>
    </AuthFrame>
  );
}

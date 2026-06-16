"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  return <p className="text-gray-500">登录中...</p>;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}

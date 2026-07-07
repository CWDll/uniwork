"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function getAuthHashMessage() {
  if (typeof window === "undefined") {
    return null;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorCode = hashParams.get("error_code");
  const errorDescription = hashParams.get("error_description");

  if (!hashParams.get("error")) {
    return null;
  }

  if (errorCode === "otp_expired") {
    return "이메일 인증 링크가 만료되었거나 이미 사용되었습니다. 이미 인증이 끝났다면 로그인하면 되고, 로그인이 안 되면 회원가입을 다시 시도해 새 인증 메일을 받아주세요.";
  }

  return (
    errorDescription ||
    "인증 링크를 처리하지 못했습니다. 다시 로그인하거나 인증 메일을 새로 받아주세요."
  );
}

function subscribeToHashChange(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);

  return () => window.removeEventListener("hashchange", onStoreChange);
}

export function AuthHashErrorBanner() {
  const message = useSyncExternalStore(
    subscribeToHashChange,
    getAuthHashMessage,
    () => null,
  );

  if (!message) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <p>{message}</p>
        <div className="flex gap-2">
          <Link className="text-blue-700 underline" href="/login">
            Log in
          </Link>
          <Link className="text-blue-700 underline" href="/signup">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

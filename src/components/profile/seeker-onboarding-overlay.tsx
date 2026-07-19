"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeekerOnboardingOverlay({
  profileHref,
  userId,
}: {
  profileHref: string;
  userId: string;
}) {
  const storageKey = `uniwork:seeker-onboarding-dismissed:${userId}`;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsOpen(window.localStorage.getItem(storageKey) !== "true");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  function dismiss() {
    window.localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-5 shadow-2xl shadow-slate-950/20 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Seeker setup
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              프로필과 이력서를 먼저 채워주세요
            </h2>
          </div>
          <button
            aria-label="닫기"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            onClick={dismiss}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          비자, 학교, 가능 근무시간과 이력서 내용을 채우면 나에게 맞는 공고를
          바로 확인하고 지원할 수 있습니다.
        </p>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          Complete your profile and resume so Uniwork can show jobs that fit your
          visa, school status, and available work hours.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Link
            className={cn(buttonVariants({ className: "h-11 w-full" }))}
            href={profileHref}
          >
            프로필로 이동
          </Link>
          <button
            className="h-11 rounded-md border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
            onClick={dismiss}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
  unstable_retry: unstableRetry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstableRetry ?? reset;

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-black uppercase tracking-wide text-red-700">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          화면을 불러오지 못했습니다
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          일시적인 네트워크 문제이거나 권한/데이터 상태가 바뀌었을 수 있습니다.
          다시 시도하거나 필요한 작업 화면으로 이동해주세요.
        </p>
        {error.digest ? (
          <p className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
            오류 추적 ID: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {retry ? (
            <button
              className={cn(buttonVariants({ className: "w-full" }))}
              onClick={() => retry()}
              type="button"
            >
              다시 시도
            </button>
          ) : null}
          <Link
            className={cn(
              buttonVariants({ className: "w-full", variant: "outline" }),
            )}
            href="/me"
          >
            내 대시보드
          </Link>
          <Link
            className={cn(
              buttonVariants({ className: "w-full", variant: "outline" }),
            )}
            href="/company"
          >
            기업 대시보드
          </Link>
        </div>
      </section>
    </main>
  );
}

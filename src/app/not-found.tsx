import Link from "next/link";

import { NotFoundBackButton } from "@/components/navigation/not-found-actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          요청한 페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          주소가 바뀌었거나, 로그인 계정에 접근 권한이 없는 페이지일 수
          있습니다. 필요한 작업 화면으로 이동해 다시 확인해주세요.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            className={cn(buttonVariants({ className: "w-full" }))}
            href="/jobs"
          >
            공고 보기
          </Link>
          <Link
            className={cn(buttonVariants({ className: "w-full", variant: "outline" }))}
            href="/me/applications"
          >
            지원 현황
          </Link>
          <Link
            className={cn(buttonVariants({ className: "w-full", variant: "outline" }))}
            href="/company"
          >
            기업 대시보드
          </Link>
          <NotFoundBackButton />
        </div>
      </section>
    </main>
  );
}

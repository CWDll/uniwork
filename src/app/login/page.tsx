import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black">Log in</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Supabase Auth 연결 전까지는 화면 구조만 준비합니다.
          </p>
          <form className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Email
              <input
                className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Password
              <input
                className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
                placeholder="••••••••"
                type="password"
              />
            </label>
            <Button className="h-11" type="button">
              Log in
            </Button>
          </form>
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            No account?{" "}
            <Link className="text-blue-700" href="/signup">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}

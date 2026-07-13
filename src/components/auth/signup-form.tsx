"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { signupAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function SignupForm({ initialRole = "seeker" }: { initialRole?: string }) {
  const [role, setRole] = useState(initialRole);
  const [state, formAction] = useActionState(signupAction, {});
  const isCompany = role === "company";

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          가입 유형
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="role"
            onChange={(event) => setRole(event.target.value)}
            value={role}
          >
            <option value="seeker">구직자</option>
            <option value="company">기업</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {isCompany ? "계정 담당자 이름" : "이름"}
          <input
            autoComplete="name"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="name"
            placeholder={isCompany ? "담당자 이름" : "이름"}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
          이메일
          <input
            autoComplete="email"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
          비밀번호
          <input
            autoComplete="new-password"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="password"
            placeholder="8자 이상"
            type="password"
          />
        </label>
        {isCompany ? (
          <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-sm font-black text-blue-950">
                기업 인증 검토 정보
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">
                가입 후 회사 정보는 운영자가 검토합니다. 승인 전에는 인증 기업
                배지가 표시되지 않습니다.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              기업명
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="company_name"
                placeholder="사업자등록증의 상호명"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              담당자명
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="manager_name"
                placeholder="채용 담당자명"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              담당자 휴대폰 번호
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="manager_phone"
                placeholder="010-0000-0000"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              사업자등록번호
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="business_number"
                placeholder="000-00-00000"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              업종
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="industry"
                placeholder="예: 카페, 음식점, 교육"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              사업장 주소
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="address"
                placeholder="사업장 주소"
              />
            </label>
            <p className="text-xs font-semibold leading-5 text-slate-500 sm:col-span-2">
              사업자등록증, 기업 유형, 재직 인원, 외국인 재직 여부, 웹사이트,
              로고 업로드는 다음 기업 온보딩 확장에서 추가할 예정입니다.
            </p>
          </div>
        ) : null}
      </div>
      {state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full" disabled={pending}>
      {pending ? "가입 처리 중..." : "가입하기"}
    </Button>
  );
}

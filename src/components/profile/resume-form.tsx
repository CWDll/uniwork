"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveResumeAction } from "@/app/me/resume/actions";
import { Button } from "@/components/ui/button";

type EducationItem = {
  major?: string;
  period?: string;
  school?: string;
};

type ExperienceItem = {
  company?: string;
  description?: string;
  period?: string;
  role?: string;
};

type LanguageItem = {
  level?: string;
  name?: string;
};

type Resume = {
  education: EducationItem[] | null;
  experience: ExperienceItem[] | null;
  id?: string | null;
  intro: string | null;
  languages: LanguageItem[] | null;
  title: string | null;
};

export function ResumeForm({ resume }: { resume: Resume | null }) {
  const [state, formAction] = useActionState(saveResumeAction, {});
  const education = resume?.education ?? [];
  const experience = resume?.experience ?? [];
  const languages = resume?.languages ?? [];
  const introReady = (resume?.intro?.trim().length ?? 0) >= 20;
  const languageReady = languages.length > 0;

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div>
        <h2 className="text-xl font-black">이력과 자기소개</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          기업이 지원자를 판단할 때 볼 수 있는 소개, 학력, 경력, 언어 정보를
          입력합니다.
        </p>
      </div>
      <div className="mt-4 grid gap-2 rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-900 sm:grid-cols-3">
        <span className="rounded-lg bg-white/70 px-3 py-2">
          자기소개 {introReady ? "완료" : "필수"}
        </span>
        <span className="rounded-lg bg-white/70 px-3 py-2">
          언어 {languageReady ? "완료" : "필수"}
        </span>
        <span className="rounded-lg bg-white/70 px-3 py-2">
          학력/경력은 선택 입력
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <Field
          label="Resume title"
          name="title"
          placeholder="Cafe service resume"
          value={resume?.title}
        />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Self introduction
          <textarea
            className="min-h-32 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            defaultValue={resume?.intro ?? ""}
            name="intro"
            placeholder="지원 직무와 관련된 경험, 성격, 근무 태도, 강점을 적어주세요."
            required
          />
          <span className="text-xs font-semibold text-slate-400">
            최소 20자 이상 입력해주세요.
          </span>
        </label>
      </div>

      <Section title="Education">
        {[0, 1].map((index) => (
          <div className="grid gap-3 md:grid-cols-3" key={index}>
            <Field
              label="School"
              name={`education_${index}_school`}
              value={education[index]?.school}
            />
            <Field
              label="Major"
              name={`education_${index}_major`}
              value={education[index]?.major}
            />
            <Field
              label="Period"
              name={`education_${index}_period`}
              placeholder="2024 - present"
              value={education[index]?.period}
            />
          </div>
        ))}
      </Section>

      <Section title="Experience">
        {[0, 1, 2].map((index) => (
          <div className="grid gap-3 rounded-xl border border-slate-100 p-3" key={index}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="Company"
                name={`experience_${index}_company`}
                value={experience[index]?.company}
              />
              <Field
                label="Role"
                name={`experience_${index}_role`}
                value={experience[index]?.role}
              />
              <Field
                label="Period"
                name={`experience_${index}_period`}
                placeholder="2025.03 - 2025.12"
                value={experience[index]?.period}
              />
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Description
              <textarea
                className="min-h-20 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
                defaultValue={experience[index]?.description ?? ""}
                name={`experience_${index}_description`}
                placeholder="담당 업무와 성과를 간단히 적어주세요."
              />
            </label>
          </div>
        ))}
      </Section>

      <Section title="Languages">
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div className="grid gap-3 rounded-xl border border-slate-100 p-3" key={index}>
              <Field
                label="Language"
                name={`language_${index}_name`}
                placeholder="Korean"
                value={languages[index]?.name}
              />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Level
                <select
                  className="h-11 rounded-md border border-slate-200 px-3"
                  defaultValue={languages[index]?.level ?? ""}
                  name={`language_${index}_level`}
                >
                  <option value="">Select</option>
                  <option>Basic</option>
                  <option>Conversational</option>
                  <option>Business</option>
                  <option>Fluent</option>
                  <option>Native</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </Section>

      {state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <div className="mt-4 rounded-md bg-emerald-50 px-3 py-3">
          <p className="text-sm font-semibold text-emerald-700">{state.message}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
            프로필도 완성되어 있다면 공고 상세에서 제출 정보 확인 후 바로 지원할 수 있습니다.
          </p>
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="mb-3 text-lg font-black">{title}</h3>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  value?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        defaultValue={value ?? ""}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? "저장 중..." : "이력/소개 저장"}
    </Button>
  );
}

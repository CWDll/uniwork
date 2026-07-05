"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveSeekerProfileAction } from "@/app/me/profile/actions";
import { Button } from "@/components/ui/button";

type SeekerProfile = {
  alien_registration_status: string | null;
  available_times: {
    weekday?: string;
    weekend?: string;
  } | null;
  english_level: string | null;
  korean_level: string | null;
  major: string | null;
  nationality: string | null;
  preferred_job_types: string[] | null;
  preferred_locations: string[] | null;
  school: string | null;
  visa_type: string | null;
};

export function SeekerProfileForm({
  profile,
}: {
  profile: SeekerProfile | null;
}) {
  const [state, formAction] = useActionState(saveSeekerProfileAction, {});

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nationality" name="nationality" value={profile?.nationality} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Visa type
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.visa_type ?? "D-2"}
            name="visa_type"
          >
            <option value="D-2">D-2</option>
            <option value="D-4">D-4</option>
            <option value="F-1">F-1 - blocked</option>
            <option value="F-2">F-2 - needs review</option>
            <option value="F-3">F-3 - blocked</option>
            <option value="F-4">F-4 - blocked</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Alien registration
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.alien_registration_status ?? "has_card"}
            name="alien_registration_status"
          >
            <option value="has_card">Has registration card</option>
            <option value="pending">Pending</option>
            <option value="not_yet">Not yet</option>
          </select>
        </label>
        <Field label="School" name="school" value={profile?.school} />
        <Field label="Major" name="major" value={profile?.major} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Korean level
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.korean_level ?? "TOPIK 3"}
            name="korean_level"
          >
            <option>Beginner</option>
            <option>TOPIK 2</option>
            <option>TOPIK 3</option>
            <option>TOPIK 4</option>
            <option>TOPIK 5+</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          English level
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.english_level ?? "Business"}
            name="english_level"
          >
            <option>Basic</option>
            <option>Business</option>
            <option>Fluent</option>
            <option>Native</option>
          </select>
        </label>
        <Field
          helper="Comma separated"
          label="Preferred locations"
          name="preferred_locations"
          value={profile?.preferred_locations?.join(", ")}
        />
        <Field
          helper="Comma separated"
          label="Preferred job types"
          name="preferred_job_types"
          value={profile?.preferred_job_types?.join(", ")}
        />
        <Field
          label="Weekday availability"
          name="weekday_availability"
          value={profile?.available_times?.weekday}
        />
        <Field
          label="Weekend availability"
          name="weekend_availability"
          value={profile?.available_times?.weekend}
        />
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

function Field({
  helper,
  label,
  name,
  value,
}: {
  helper?: string;
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        defaultValue={value ?? ""}
        name={name}
      />
      {helper ? (
        <span className="text-xs font-semibold text-slate-400">{helper}</span>
      ) : null}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? "Saving..." : "Save profile"}
    </Button>
  );
}

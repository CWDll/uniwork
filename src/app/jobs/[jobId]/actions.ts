"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function applyToJobAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    return;
  }

  if (!user) {
    redirect(`/login?next=/jobs/${jobId}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seeker") {
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle();

  if (!job) {
    return;
  }

  const message = String(formData.get("message") ?? "").trim();
  const { error } = await supabase.from("job_applications").insert({
    job_id: job.id,
    seeker_id: user.id,
    message,
    status: "submitted",
  });

  if (error) {
    return;
  }

  revalidatePath("/me/applications");
  revalidatePath(`/jobs/${job.id}`);
  revalidatePath("/company/applications");

  return;
}

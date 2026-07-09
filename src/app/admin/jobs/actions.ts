"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type JobStatus = "draft" | "published" | "rejected" | "closed";

export async function updateJobStatusAction(formData: FormData) {
  const jobId = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "") as JobStatus;
  const reviewNote = String(formData.get("review_note") ?? "").trim();

  if (!jobId || !["draft", "published", "rejected", "closed"].includes(status)) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  if (status === "rejected" && reviewNote.length < 5) {
    return;
  }

  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const closedAt = status === "closed" ? new Date().toISOString() : null;
  const reviewedAt = new Date().toISOString();

  await supabase
    .from("jobs")
    .update({
      closed_at: closedAt,
      published_at: publishedAt,
      review_note: reviewNote || null,
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      status,
      updated_at: reviewedAt,
    })
    .eq("id", jobId);

  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  revalidatePath("/");
}

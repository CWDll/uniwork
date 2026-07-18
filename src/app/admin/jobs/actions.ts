"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type JobStatus = "published" | "closed";

export async function updateJobStatusAction(formData: FormData) {
  const jobId = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "") as JobStatus;
  const reviewNote = String(formData.get("review_note") ?? "").trim();

  if (!jobId || !["published", "closed"].includes(status)) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const reviewedAt = new Date().toISOString();
  const statusPayload =
    status === "published"
      ? { closed_at: null, published_at: reviewedAt }
      : { closed_at: reviewedAt };

  await supabase
    .from("jobs")
    .update({
      review_note: reviewNote || null,
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      status,
      ...statusPayload,
      updated_at: reviewedAt,
    })
    .eq("id", jobId);

  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  revalidatePath("/");
}

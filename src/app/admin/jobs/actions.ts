"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type JobStatus = "draft" | "published" | "rejected" | "closed";

export async function updateJobStatusAction(formData: FormData) {
  const jobId = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "") as JobStatus;

  if (!jobId || !["draft", "published", "rejected", "closed"].includes(status)) {
    return;
  }

  const supabase = await createClient();
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const closedAt = status === "closed" ? new Date().toISOString() : null;

  await supabase
    .from("jobs")
    .update({
      closed_at: closedAt,
      published_at: publishedAt,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  revalidatePath("/");
}

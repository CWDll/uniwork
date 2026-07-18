"use server";

import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/admin-auth";

const allowedStatuses = ["pending", "verified", "rejected"];

export async function updateCompanyVerificationAction(formData: FormData) {
  const adminContext = await getAdminContext();
  const companyId = String(formData.get("company_id") ?? "").trim();
  const status = String(formData.get("verification_status") ?? "").trim();
  const note = String(formData.get("verification_note") ?? "").trim();

  if (!adminContext || !companyId || !allowedStatuses.includes(status)) {
    return;
  }

  if (status === "rejected" && note.length < 5) {
    return;
  }

  const reviewedAt = new Date().toISOString();
  const { supabase, user } = adminContext;

  await supabase
    .from("companies")
    .update({
      updated_at: reviewedAt,
      verification_note: note || null,
      verification_status: status,
      verified_at: status === "verified" ? reviewedAt : null,
      verified_by: status === "verified" ? user.id : null,
    })
    .eq("id", companyId);

  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  revalidatePath("/company");
  revalidatePath("/company/settings");
  revalidatePath("/company/jobs");
}

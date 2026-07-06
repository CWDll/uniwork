"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateAdminRequestAction(formData: FormData) {
  const supabase = await createClient();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  const allowedStatuses = [
    "received",
    "reviewing",
    "partner_needed",
    "assigned",
    "completed",
    "rejected",
  ];

  if (!requestId || !allowedStatuses.includes(status)) {
    return;
  }

  await supabase
    .from("admin_requests")
    .update({
      status,
      memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath("/me/admin-requests");
}

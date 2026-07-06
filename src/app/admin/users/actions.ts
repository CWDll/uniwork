"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const allowedRoles = ["seeker", "company", "partner", "admin"];

export async function updateUserRoleAction(formData: FormData) {
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!userId || !allowedRoles.includes(role)) {
    return;
  }

  await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  revalidatePath("/admin/users");
  revalidatePath("/admin/admin-requests");
}

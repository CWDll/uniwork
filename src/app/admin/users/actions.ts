"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const allowedRoles = ["seeker", "company", "partner", "admin"];

type UserRoleState = {
  error?: string;
  message?: string;
};

export async function updateUserRoleAction(
  _prevState: UserRoleState,
  formData: FormData,
): Promise<UserRoleState> {
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!userId || !allowedRoles.includes(role)) {
    return { error: "사용자와 역할을 확인해주세요." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/admin-requests");

  return { message: "사용자 역할이 업데이트되었습니다." };
}

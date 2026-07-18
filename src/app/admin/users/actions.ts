"use server";

import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/admin-auth";

const allowedRoles = ["seeker", "company", "partner", "admin"];

type UserRoleState = {
  error?: string;
  message?: string;
};

export async function updateUserRoleAction(
  _prevState: UserRoleState,
  formData: FormData,
): Promise<UserRoleState> {
  const adminContext = await getAdminContext();
  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!adminContext) {
    return { error: "관리자 권한이 필요합니다." };
  }

  if (!userId || !allowedRoles.includes(role)) {
    return { error: "사용자와 역할을 확인해주세요." };
  }

  const { supabase } = adminContext;
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

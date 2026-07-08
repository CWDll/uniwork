import type { SupabaseClient } from "@supabase/supabase-js";

export const profilePhotoBucket = "profile-photos";

export function getProfilePhotoUrl(
  supabase: SupabaseClient,
  avatarPath?: string | null,
) {
  if (!avatarPath) {
    return null;
  }

  return supabase.storage.from(profilePhotoBucket).getPublicUrl(avatarPath).data
    .publicUrl;
}

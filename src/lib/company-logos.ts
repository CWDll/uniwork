import type { SupabaseClient } from "@supabase/supabase-js";

export const companyLogosBucket = "company-logos";

export const maxCompanyLogoSize = 5 * 1024 * 1024;

export const allowedCompanyLogoTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function getCompanyLogoExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function getCompanyLogoUrl(
  supabase: SupabaseClient,
  logoPath?: string | null,
) {
  if (!logoPath) {
    return null;
  }

  return supabase.storage.from(companyLogosBucket).getPublicUrl(logoPath).data
    .publicUrl;
}

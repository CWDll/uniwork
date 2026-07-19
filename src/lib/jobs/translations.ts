import type { Locale } from "@/lib/i18n";

export type JobTranslation = {
  description?: string | null;
  job_id: string;
  korean_requirement?: string | null;
  locale: "en";
  location?: string | null;
  title?: string | null;
  visa_support_type?: string | null;
};

export function getTranslationByJobId(
  translations: JobTranslation[] | null | undefined,
) {
  return new Map(
    (translations ?? []).map((translation) => [
      String(translation.job_id),
      translation,
    ]),
  );
}

export function localizedJobValue(
  value: string | null | undefined,
  translationValue: string | null | undefined,
  locale: Locale,
) {
  const fallback = value?.trim() ?? "";

  if (locale !== "en") {
    return fallback;
  }

  return translationValue?.trim() || fallback;
}

export function hasUsefulTranslation(translation: JobTranslation | undefined) {
  return Boolean(
    translation?.title?.trim() ||
      translation?.description?.trim() ||
      translation?.location?.trim() ||
      translation?.visa_support_type?.trim() ||
      translation?.korean_requirement?.trim(),
  );
}

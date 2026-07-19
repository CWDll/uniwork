import type { Locale } from "@/lib/i18n";

const completionLabels: Record<string, string> = {
  "근무 가능 시간": "Availability",
  "국적": "Nationality",
  "비자 종류": "Visa status",
  "외국인등록 상태": "Alien registration status",
  "이력서 생성": "Resume created",
  "이력서 제목": "Resume title",
  "언어 능력": "Language ability",
  "영어 수준": "English level",
  "자기소개 20자 이상": "Self introduction",
  "전공": "Major",
  "학교": "School",
  "한국어 수준": "Korean level",
  "희망 지역": "Preferred location",
  "희망 직무": "Preferred job type",
};

export function translateCompletionLabel(item: string, locale: Locale) {
  return locale === "en" ? completionLabels[item] ?? item : item;
}

export function translateCompletionItems(items: string[], locale: Locale) {
  return items.map((item) => translateCompletionLabel(item, locale));
}

export const locales = ["ko", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ko" || value === "en";
}

export function getLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ko";
}

export function stripLocaleFromPathname(pathname: string) {
  if (pathname === "/en") {
    return "/";
  }

  if (pathname.startsWith("/en/")) {
    return pathname.slice(3) || "/";
  }

  return pathname || "/";
}

export function getLocalizedPath(path: string, locale: Locale) {
  const [pathnamePart, queryPart] = path.split("?");
  const pathname = pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`;
  const stripped = stripLocaleFromPathname(pathname);
  const localized =
    locale === "en" ? (stripped === "/" ? "/en" : `/en${stripped}`) : stripped;

  return queryPart ? `${localized}?${queryPart}` : localized;
}

export function getOppositeLocale(locale: Locale): Locale {
  return locale === "en" ? "ko" : "en";
}

export const publicCopy = {
  ko: {
    admin: "운영자",
    apply: "지원하기",
    auth: "로그인",
    companyService: "기업 서비스",
    dashboard: "대시보드",
    jobs: "채용공고",
    login: "로그인",
    logout: "로그아웃",
    myAccount: "내 계정",
    signUp: "회원가입",
    tagline: "외국인 유학생 채용 플랫폼",
  },
  en: {
    admin: "Admin",
    apply: "Apply",
    auth: "Log in",
    companyService: "For Companies",
    dashboard: "Dashboard",
    jobs: "Jobs",
    login: "Log in",
    logout: "Log out",
    myAccount: "My account",
    signUp: "Sign up",
    tagline: "Jobs for foreign students in Korea",
  },
} satisfies Record<Locale, Record<string, string>>;

export function getEmploymentTypeLabel(value: string | null | undefined, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    Contract: { en: "Contract", ko: "계약직" },
    "Full-time": { en: "Full-time", ko: "정규직" },
    Internship: { en: "Internship", ko: "인턴십" },
    "Part-time": { en: "Part-time", ko: "시간제" },
  };

  return value ? (labels[value]?.[locale] ?? value) : "-";
}

export function getWageTypeLabel(value: string | null | undefined, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    hourly: { en: "hourly", ko: "시급" },
    monthly: { en: "monthly", ko: "월급" },
    project: { en: "per project", ko: "건별" },
  };

  return value ? (labels[value]?.[locale] ?? value) : "";
}

export function formatWage(
  amount: number | null | undefined,
  wageType: string | null | undefined,
  locale: Locale,
) {
  if (!amount || !wageType) {
    return locale === "en" ? "Negotiable" : "협의";
  }

  const formatted = Number(amount).toLocaleString(locale === "en" ? "en-US" : "ko-KR");
  const wageLabel = getWageTypeLabel(wageType, locale);

  return locale === "en"
    ? `KRW ${formatted} / ${wageLabel}`
    : `${formatted}원 / ${wageLabel}`;
}

export function getJobFallbackLabel(key: "company" | "korean" | "visa", locale: Locale) {
  const labels = {
    company: { en: "Company", ko: "기업" },
    korean: { en: "Korean negotiable", ko: "한국어 조건 협의" },
    visa: { en: "Visa review", ko: "비자 조건 검토" },
  } satisfies Record<string, Record<Locale, string>>;

  return labels[key][locale];
}

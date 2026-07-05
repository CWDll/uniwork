export const categories = [
  "All Jobs",
  "Cafe & Service",
  "Office",
  "Translation",
  "Marketing",
  "Education",
];

export const jobs = [
  {
    company: "Hankuk Language Center",
    logo: "HL",
    title: "Korean-English Campus Supporter",
    location: "Seoul Mapo-gu",
    type: "Part-time",
    visa: "D-2 / D-4",
    category: "Education",
    wage: "13,000 KRW / hour",
    featured: true,
  },
  {
    company: "Blue Bottle Korea",
    logo: "BB",
    title: "Weekend Cafe Crew",
    location: "Seoul Seongsu",
    type: "Part-time",
    visa: "D-2 review",
    category: "Cafe & Service",
    wage: "12,500 KRW / hour",
    featured: true,
  },
  {
    company: "K-Beauty Global",
    logo: "KG",
    title: "SNS Translation Assistant",
    location: "Remote",
    type: "Contract",
    visa: "D-2 / F review",
    category: "Marketing",
    wage: "Project based",
    featured: false,
  },
];

export const applicationTips = [
  "D-2/D-4 시간제 취업 허가 여부를 먼저 확인하세요.",
  "외국인등록번호 원본은 플랫폼에 입력하지 않습니다.",
  "지원 전 근무시간과 시급을 공고 상세에서 확인하세요.",
];

export const adminRequestStatuses = [
  { label: "접수", value: 12 },
  { label: "운영자 검토", value: 7 },
  { label: "행정사 배정", value: 4 },
  { label: "완료", value: 2 },
];

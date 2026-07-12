import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function printPass(message) {
  console.log(`PASS ${message}`);
}

function normalizeHtml(value) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
}

async function readText(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const text = await response.text();

  return {
    body: normalizeHtml(text),
    headers: response.headers,
    response,
  };
}

function assertIncludes(body, needle, pageLabel) {
  assert(body.includes(needle), `${pageLabel} is missing "${needle}".`);
}

async function assertPage(url, pageLabel, expectedText) {
  const { body, response } = await readText(url);
  assert(response.ok, `${pageLabel} returned HTTP ${response.status}.`);

  for (const text of expectedText) {
    assertIncludes(body, text, pageLabel);
  }

  printPass(`${pageLabel} renders expected copy`);
  return body;
}

loadEnvFile(".env.local");

const targetUrl = new URL(
  process.argv[2] ||
    process.env.PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://uniwork-one.vercel.app",
);

assert(
  ["http:", "https:"].includes(targetUrl.protocol),
  "Target URL must be http or https.",
);

if (targetUrl.hostname !== "localhost" && targetUrl.hostname !== "127.0.0.1") {
  assert(targetUrl.protocol === "https:", "Production-like URL must use https.");
}

console.log(`Checking public journey at ${targetUrl.origin}`);

const homeBody = await assertPage(targetUrl, "Home", [
  "Uniwork",
  "공고 보기",
  "구직자 시작",
  "기업 시작",
]);
assertIncludes(
  homeBody,
  'rel="manifest" href="/manifest.webmanifest"',
  "Home metadata",
);
printPass("Home links PWA manifest");

await assertPage(new URL("/jobs", targetUrl), "Jobs", [
  "Jobs | Uniwork",
  "Search jobs",
  "지원 가능성을 먼저 확인하는 채용공고",
]);

await assertPage(new URL("/corp", targetUrl), "Company landing", [
  "For Companies | Uniwork",
  "기업 대시보드 보기",
  "기업 계정 만들기",
]);

await assertPage(new URL("/login", targetUrl), "Login", [
  "이메일",
  "비밀번호",
]);

await assertPage(new URL("/signup", targetUrl), "Signup", [
  "Sign up",
  "Seeker",
  "Company",
]);

const manifestResponse = await fetch(new URL("/manifest.webmanifest", targetUrl), {
  cache: "no-store",
});
assert(manifestResponse.ok, `Manifest returned HTTP ${manifestResponse.status}.`);
const manifest = await manifestResponse.json();
assert(manifest.name === "Uniwork", "Manifest name mismatch.");
assert(manifest.display === "standalone", "Manifest display must be standalone.");
printPass("Manifest is valid");

const healthResponse = await fetch(new URL("/api/health", targetUrl), {
  cache: "no-store",
});
assert(healthResponse.ok, `Health endpoint returned HTTP ${healthResponse.status}.`);
const health = await healthResponse.json();
assert(health.status === "ok", "Health endpoint did not return ok.");
printPass("Health endpoint is ok");

const protectedResponse = await fetch(new URL("/me", targetUrl), {
  cache: "no-store",
  redirect: "manual",
});
assert(
  [302, 303, 307, 308].includes(protectedResponse.status),
  `/me should redirect unauthenticated users, got HTTP ${protectedResponse.status}.`,
);
assert(
  protectedResponse.headers.get("location")?.includes("/login"),
  "/me redirect should point to login.",
);
printPass("Protected seeker route redirects to login");

const notFound = await readText(new URL("/definitely-not-found-qa", targetUrl));
assert(notFound.response.status === 404, "Unknown route should return HTTP 404.");
assertIncludes(
  notFound.body,
  "요청한 페이지를 찾을 수 없습니다",
  "Not-found page",
);
printPass("Not-found recovery page renders");

console.log("Public journey check passed.");

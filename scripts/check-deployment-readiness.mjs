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
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

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

function printWarn(message) {
  console.log(`WARN ${message}`);
}

loadEnvFile(".env.local");

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

for (const key of requiredEnv) {
  assert(process.env[key], `Missing ${key}`);
  printPass(`${key} is set`);
}

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
assert(
  supabaseUrl.protocol === "https:",
  "NEXT_PUBLIC_SUPABASE_URL must be an https URL",
);
printPass("Supabase URL is valid");

if (process.env.NEXT_PUBLIC_SITE_URL) {
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  assert(
    ["http:", "https:"].includes(siteUrl.protocol),
    "NEXT_PUBLIC_SITE_URL must be an http(s) URL",
  );
  printPass("Site URL is valid");
} else {
  printWarn("NEXT_PUBLIC_SITE_URL is not set locally; set it in Vercel production");
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  printWarn(
    "SUPABASE_SERVICE_ROLE_KEY is present locally. Do not add it to Vercel unless a server-only runtime feature needs it.",
  );
}

const requiredFiles = [
  "public/sw.js",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/maskable-512.png",
  "public/icons/apple-touch-icon.png",
  "src/app/manifest.ts",
  "docs/deployment.md",
];

for (const path of requiredFiles) {
  assert(existsSync(path), `Missing ${path}`);
}
printPass("PWA and deployment files exist");

const response = await fetch(
  `${supabaseUrl.origin}/rest/v1/visa_eligibility_rules?select=visa_type&limit=1`,
  {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  },
);

assert(
  response.ok,
  `Supabase REST check failed with HTTP ${response.status}`,
);
printPass("Supabase REST/RLS public read check passed");

console.log("Deployment readiness check passed.");

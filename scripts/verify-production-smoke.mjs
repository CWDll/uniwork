import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import WebSocket from "ws";

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

async function readJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  assert(response.ok, `${url} returned HTTP ${response.status}`);
  return response.json();
}

async function assertHeadOk(url) {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  assert(response.ok, `${url} returned HTTP ${response.status}`);
}

function createSupabaseClient(key) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });
}

loadEnvFile(".env.local");

const productionUrl = new URL(
  process.argv[2] ||
    process.env.PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://uniwork-one.vercel.app",
);

assert(
  productionUrl.protocol === "https:",
  "Production URL must use https.",
);

assert(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Missing NEXT_PUBLIC_SUPABASE_URL.",
);
assert(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.",
);

console.log(`Checking ${productionUrl.origin}`);

const health = await readJson(new URL("/api/health", productionUrl));
assert(health.status === "ok", "Health endpoint did not return ok.");
assert(health.supabase?.ok === true, "Health endpoint Supabase check failed.");
console.log("PASS health endpoint");

const manifest = await readJson(new URL("/manifest.webmanifest", productionUrl));
assert(manifest.name === "Uniwork", "Manifest name mismatch.");
assert(manifest.display === "standalone", "Manifest display must be standalone.");
assert(
  Array.isArray(manifest.icons) && manifest.icons.length >= 3,
  "Manifest must include app icons.",
);
console.log("PASS PWA manifest");

await assertHeadOk(new URL("/sw.js", productionUrl));
await assertHeadOk(new URL("/icons/icon-512.png", productionUrl));
await assertHeadOk(new URL("/login", productionUrl));
await assertHeadOk(new URL("/signup", productionUrl));
console.log("PASS public production routes and assets");

const homeResponse = await fetch(productionUrl, { cache: "no-store" });
assert(homeResponse.ok, `Home returned HTTP ${homeResponse.status}`);
const homeHtml = await homeResponse.text();
assert(
  homeHtml.includes(`rel="canonical" href="${productionUrl.origin}"`),
  "Canonical URL is not the production origin.",
);
assert(
  homeHtml.includes('rel="manifest" href="/manifest.webmanifest"'),
  "Manifest link missing from home page.",
);
console.log("PASS metadata");

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `prod-smoke-${suffix}@gmail.com`;
  const password = `ProdSmoke-${suffix}-pass!`;

  try {
    const linkResult = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: {
          name: "Uniwork Production Smoke",
          role: "seeker",
        },
        redirectTo: new URL("/auth/callback", productionUrl).toString(),
      },
    });

    if (linkResult.error) {
      throw new Error(
        `Production signup redirect failed: ${linkResult.error.message}`,
      );
    }

    assert(
      linkResult.data.user?.id,
      "Production signup link did not create a test user.",
    );
    const actionLink = linkResult.data.properties?.action_link;
    assert(actionLink, "Generated signup link is missing.");

    const actionUrl = new URL(actionLink);
    const redirectTo = actionUrl.searchParams.get("redirect_to");
    assert(
      redirectTo === new URL("/auth/callback", productionUrl).toString(),
      "Generated signup link does not include the production callback URL.",
    );
    console.log("PASS Supabase Auth production redirect URL accepted");
  } finally {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = data?.users?.filter((user) => user.email === email) ?? [];

    for (const user of users) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
} else {
  console.log(
    "WARN SUPABASE_SERVICE_ROLE_KEY missing; skipped signup redirect smoke cleanup.",
  );
}

console.log("Production smoke check passed.");

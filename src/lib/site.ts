export function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!siteUrl) {
    return new URL("http://localhost:3000");
  }

  const normalizedUrl = siteUrl.startsWith("http")
    ? siteUrl
    : `https://${siteUrl}`;

  return new URL(normalizedUrl);
}

import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/admin-auth";
import { companyRegistrationDocumentsBucket } from "@/lib/company-documents";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const { supabase } = await requireAdmin(
    `/api/admin/company-registration-documents/${companyId}/download`,
  );

  const { data: company } = await supabase
    .from("companies")
    .select("name, business_registration_path")
    .eq("id", companyId)
    .maybeSingle();

  if (!company?.business_registration_path) {
    notFound();
  }

  const { data: file, error } = await supabase.storage
    .from(companyRegistrationDocumentsBucket)
    .download(company.business_registration_path);

  if (error || !file) {
    notFound();
  }

  const filename = buildDownloadFilename({
    companyName: company.name,
    path: company.business_registration_path,
  });

  return new Response(await file.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": file.type || "application/octet-stream",
    },
  });
}

function buildDownloadFilename({
  companyName,
  path,
}: {
  companyName: string;
  path: string;
}) {
  const extension = path.split(".").pop() || "file";
  const safeCompanyName = companyName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return `${safeCompanyName || "company"}-business-registration.${extension}`;
}

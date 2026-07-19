import { notFound } from "next/navigation";

import { adminRequestFilesBucket } from "@/lib/admin-request-files";
import { requireAdmin } from "@/lib/admin-auth";
import { createZipArchive, sanitizeZipFilename } from "@/lib/zip";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  const { supabase } = await requireAdmin(
    `/api/admin/admin-requests/${requestId}/files`,
  );

  const { data: adminRequest } = await supabase
    .from("admin_requests")
    .select("id, type, created_at")
    .eq("id", requestId)
    .maybeSingle();

  if (!adminRequest) {
    notFound();
  }

  const { data: files } = await supabase
    .from("admin_request_files")
    .select(
      "id, storage_path, original_name, source, supplement_id, uploaded_at",
    )
    .eq("request_id", requestId)
    .order("uploaded_at", { ascending: true });

  if (!files || files.length === 0) {
    notFound();
  }

  const zipEntries = [];

  for (const [index, file] of files.entries()) {
    const { data, error } = await supabase.storage
      .from(adminRequestFilesBucket)
      .download(file.storage_path);

    if (error) {
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const sourceLabel = file.source === "supplement" ? "supplement" : "request";
    const suffix = file.supplement_id
      ? `-${file.supplement_id.slice(0, 8)}`
      : "";

    zipEntries.push({
      data: buffer,
      name: `${String(index + 1).padStart(2, "0")}-${sourceLabel}${suffix}-${sanitizeZipFilename(
        file.original_name,
        `file-${index + 1}`,
      )}`,
    });
  }

  if (zipEntries.length === 0) {
    notFound();
  }

  const archive = createZipArchive(zipEntries);
  const filename = sanitizeZipFilename(
    `uniwork-admin-request-${adminRequest.type}-${adminRequest.id}.zip`,
    `uniwork-admin-request-${adminRequest.id}.zip`,
  );

  return new Response(archive, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        filename,
      )}`,
      "Content-Type": "application/zip",
    },
  });
}

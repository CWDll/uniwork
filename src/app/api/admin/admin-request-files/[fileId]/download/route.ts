import { notFound } from "next/navigation";

import { adminRequestFilesBucket } from "@/lib/admin-request-files";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const { supabase } = await requireAdmin(
    `/api/admin/admin-request-files/${fileId}/download`,
  );

  const { data: file } = await supabase
    .from("admin_request_files")
    .select("storage_path, original_name, mime_type")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) {
    notFound();
  }

  const { data, error } = await supabase.storage
    .from(adminRequestFilesBucket)
    .download(file.storage_path);

  if (error) {
    notFound();
  }

  return new Response(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        sanitizeFilename(file.original_name),
      )}`,
      "Content-Type": file.mime_type || "application/octet-stream",
    },
  });
}

function sanitizeFilename(value: string) {
  return value.replace(/[\r\n"]/g, "").trim() || "admin-request-file";
}

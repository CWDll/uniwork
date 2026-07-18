export const adminRequestFilesBucket = "admin-request-files";

export const maxAdminRequestFileSize = 10 * 1024 * 1024;

export const allowedAdminRequestFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export function getAdminRequestFileExtension(file: File) {
  if (file.type === "application/pdf") {
    return "pdf";
  }

  if (file.type === "image/png") {
    return "png";
  }

  return "jpg";
}

export function getAdminRequestFiles(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function getAdminRequestFileValidationError(files: File[]) {
  const invalidType = files.find(
    (file) => !allowedAdminRequestFileTypes.includes(file.type),
  );

  if (invalidType) {
    return "첨부 파일은 PDF, JPG, JPEG, PNG 파일만 업로드할 수 있습니다.";
  }

  const oversized = files.find((file) => file.size > maxAdminRequestFileSize);

  if (oversized) {
    return "첨부 파일은 파일당 10MB 이하로 업로드해주세요.";
  }

  if (files.length > 5) {
    return "첨부 파일은 한 번에 최대 5개까지 업로드할 수 있습니다.";
  }

  return null;
}

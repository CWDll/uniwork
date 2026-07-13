export const companyRegistrationDocumentsBucket =
  "company-registration-documents";

export const maxCompanyRegistrationDocumentSize = 5 * 1024 * 1024;

export const allowedCompanyRegistrationDocumentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export function getCompanyRegistrationDocumentExtension(file: File) {
  if (file.type === "application/pdf") {
    return "pdf";
  }

  if (file.type === "image/png") {
    return "png";
  }

  return "jpg";
}

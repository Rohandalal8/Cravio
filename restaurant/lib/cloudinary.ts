const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type UploadSignature = {
  apiKey: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

async function getUploadSignature(token: string, uploadType: "menu" | "restaurant", documentType: string) {
  const response = await fetch(`${apiUrl}/uploads/signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uploadType, documentType }),
  });
  const payload = await response.json().catch(() => null) as { data?: UploadSignature; message?: string } | null;
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.message ?? "Unable to prepare image upload.");
  }
  return payload.data;
}

function createUploadForm(file: File, uploadData: UploadSignature) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", uploadData.apiKey);
  formData.append("folder", uploadData.folder);
  formData.append("public_id", uploadData.publicId);
  formData.append("signature", uploadData.signature);
  formData.append("timestamp", String(uploadData.timestamp));
  return formData;
}

async function uploadImage(file: File, token: string, uploadType: "menu" | "restaurant", documentType: string) {
  const uploadData = await getUploadSignature(token, uploadType, documentType);
  const response = await fetch(uploadData.uploadUrl, { method: "POST", body: createUploadForm(file, uploadData) });
  const result = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !result?.secure_url) {
    throw new Error(result?.error?.message ?? "Image upload failed. Please try again.");
  }
  return result.secure_url;
}

export function uploadMenuImage(file: File, token: string): Promise<string> {
  return uploadImage(file, token, "menu", "dish");
}

export async function uploadRestaurantImage(file: File, token: string): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Restaurant images must be JPG, PNG, or WEBP files.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Restaurant image must be smaller than 10 MB.");
  }
  return uploadImage(file, token, "restaurant", "cover-image");
}

import { auth } from "@/lib/firebase";

export type ApplicationState = "PENDING" | "APPROVED" | "REJECTED";
export type PlatformRole = "CUSTOMER" | "RESTAURANT_OWNER" | "RIDER" | "ADMIN";

export type ApplicationSummary = {
  id: string;
  status: ApplicationState;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type ApplicationStatus = {
  role: PlatformRole;
  roles: PlatformRole[];
  ownerApplication: ApplicationSummary | null;
  riderApplication: ApplicationSummary | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export async function fetchApplicationStatus(): Promise<ApplicationStatus> {
  if (!auth?.currentUser) {
    throw new Error("Please sign in to check your partner status.");
  }

  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${apiUrl}/applications/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await response.json().catch(() => null)) as { data?: ApplicationStatus; message?: string } | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.message ?? "Unable to check your partner status.");
  }

  return payload.data;
}

export async function submitApplication(type: "owner" | "rider", data: Record<string, unknown>) {
  if (!auth?.currentUser) throw new Error("Your session has expired. Please sign in again.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${apiUrl}/applications/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const payload = (await response.json().catch(() => null)) as { data?: ApplicationSummary; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message ?? "Your application could not be submitted.");
  return payload?.data;
}

export function uploadApplicationFile(file: File, applicationType: "owner" | "rider", documentType: string, onProgress?: (progress: number) => void) {
  const currentUser = auth?.currentUser;
  if (!currentUser) throw new Error("Your session has expired. Please sign in again.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Each document must be smaller than 10 MB.");
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Documents must be PDF, JPG, PNG, or WEBP files.");
  }
  return (async () => {
    const token = await currentUser.getIdToken();
    const signatureResponse = await fetch(`${apiUrl}/uploads/signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uploadType: "application", applicationType, documentType }),
    });
    const signaturePayload = (await signatureResponse.json().catch(() => null)) as {
      data?: { apiKey: string; cloudName: string; folder: string; publicId: string; signature: string; timestamp: number; uploadUrl: string };
      message?: string;
    } | null;
    if (!signatureResponse.ok || !signaturePayload?.data) {
      throw new Error(signaturePayload?.message ?? "Unable to prepare document upload.");
    }

    const uploadData = signaturePayload.data;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", uploadData.apiKey);
    formData.append("folder", uploadData.folder);
    formData.append("public_id", uploadData.publicId);
    formData.append("signature", uploadData.signature);
    formData.append("timestamp", String(uploadData.timestamp));

    return new Promise<string>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", uploadData.uploadUrl);
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      request.addEventListener("error", () => reject(new Error("Document upload failed. Please try again.")));
      request.addEventListener("load", () => {
        let response: { secure_url?: string; error?: { message?: string } };
        try {
          response = JSON.parse(request.responseText) as typeof response;
        } catch {
          reject(new Error("Document upload returned an invalid response."));
          return;
        }
        if (request.status < 200 || request.status >= 300 || !response.secure_url) {
          reject(new Error(response.error?.message ?? "Document upload failed. Please try again."));
          return;
        }
        onProgress?.(100);
        resolve(response.secure_url);
      });
      request.send(formData);
    });
  })();
}

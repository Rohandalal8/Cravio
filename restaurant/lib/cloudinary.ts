const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export async function uploadMenuImage(file: File, token: string): Promise<string> {
  const signatureResponse = await fetch(`${apiUrl}/uploads/signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uploadType: "menu", documentType: "dish" }),
  });
  const signaturePayload = (await signatureResponse.json().catch(() => null)) as {
    data?: { apiKey: string; folder: string; publicId: string; signature: string; timestamp: number; uploadUrl: string };
    message?: string;
  } | null;
  if (!signatureResponse.ok || !signaturePayload?.data) {
    throw new Error(signaturePayload?.message ?? "Unable to prepare image upload.");
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
    request.addEventListener("error", () => reject(new Error("Image upload failed. Please try again.")));
    request.addEventListener("load", () => {
      let response: { secure_url?: string; error?: { message?: string } };
      try {
        response = JSON.parse(request.responseText) as typeof response;
      } catch {
        reject(new Error("Image upload returned an invalid response."));
        return;
      }
      if (request.status < 200 || request.status >= 300 || !response.secure_url) {
        reject(new Error(response.error?.message ?? "Image upload failed. Please try again."));
        return;
      }
      resolve(response.secure_url);
    });
    request.send(formData);
  });
}

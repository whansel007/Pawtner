/** A picked photo as the base64 body (no data: prefix) and MIME type the pill photo endpoints expect. */
export async function fileToBase64(file: File): Promise<{ imageBase64: string; mimeType: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { imageBase64: btoa(binary), mimeType: file.type || "image/jpeg" };
}

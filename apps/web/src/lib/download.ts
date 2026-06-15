const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function downloadApiFile(path: string, filename: string) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Download failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

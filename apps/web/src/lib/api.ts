const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(init.headers);

  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("content-type") && !headers.has("Content-Type")) {
    headers.set("content-type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, credentials: "include", headers });
  } catch (err: any) {
    throw new Error(
      `Failed to fetch (${url}). Likely CORS/preflight or server unreachable. Original: ${err?.message ?? err}`,
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    if (text) {
      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(text) as any;
          msg = data?.message ?? data?.error ?? msg;
        } catch {
          msg = text;
        }
      } else {
        msg = text;
      }
    }
    throw new Error(Array.isArray(msg) ? msg.join(", ") : String(msg));
  }

  if (!text) return {} as T;
  if (contentType.includes("application/json")) return JSON.parse(text) as T;
  return text as unknown as T;
}
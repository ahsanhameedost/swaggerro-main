const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

/**
 * Resolve a stored image reference to a URL for the *current* environment.
 *
 * Uploaded assets (seller store logos, favicons, per-product logos) save both a
 * full `url` (with the host baked in at upload time) and a clean `key`. Because
 * local and live share one database, a URL uploaded on localhost would otherwise
 * render as `http://localhost:3001/...` on the live site (and vice-versa),
 * breaking the image. This rebuilds the URL against the current API base so it
 * works in whichever environment is rendering.
 *
 * - If a `key` is given, build the local-storage URL from it (host-independent).
 * - Otherwise, if the stored `url` points at our local-storage route, swap its
 *   host for the current base (heals old rows with no key).
 * - Any other absolute URL (e.g. S3/CDN) is returned unchanged.
 */
export function resolveStorageUrl(
  url?: string | null,
  key?: string | null
): string | null {
  const base = API_URL.replace(/\/+$/, "");

  if (key) return `${base}/storage/local/${key.replace(/^\/+/, "")}`;
  if (!url) return null;

  const marker = "/storage/local/";
  const i = url.indexOf(marker);
  if (i !== -1) return `${base}${url.slice(i)}`;

  return url;
}

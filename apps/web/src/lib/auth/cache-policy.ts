export function privateAuthCacheHeaders() {
  return {
    "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
  } as const;
}

export function applyPrivateAuthCachePolicy<T extends { headers: Headers }>(response: T): T {
  Object.entries(privateAuthCacheHeaders()).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

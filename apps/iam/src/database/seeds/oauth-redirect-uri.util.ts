/** 本地开发常见 SPA callback 地址（localhost + 127.0.0.1） */
export function devRedirectUris(ports: number[]): string[] {
  const uris: string[] = [];
  for (const port of ports) {
    uris.push(`http://localhost:${port}/callback.html`);
    uris.push(`http://127.0.0.1:${port}/callback.html`);
  }
  return uris;
}

export function mergeRedirectUris(
  existing: string[] | null | undefined,
  required: string[],
): string[] {
  return [...new Set([...(existing ?? []), ...required])];
}

/** IAM 门户 API 响应解包（Nest TransformInterceptor: { code, data, message }） */
export function unwrapIamPayload<T = unknown>(body: unknown): T {
  if (
    body &&
    typeof body === 'object' &&
    'code' in body &&
    (body as { code: number }).code === 0
  ) {
    return (body as unknown as { data: T }).data;
  }
  return body as T;
}

/** pure-admin 兼容：{ success, data } 再解一层 */
export function unwrapPortalResponse<T = unknown>(body: unknown): T {
  const layer = unwrapIamPayload<{ success?: boolean; data?: T } | T>(body);
  if (
    layer &&
    typeof layer === 'object' &&
    'success' in layer &&
    'data' in layer
  ) {
    return (layer as { data: T }).data;
  }
  return layer as T;
}

/** node-oidc-provider 要求的 RSA 私钥 JWK（含 CRT 参数）。 */
export type OidcRsaPrivateJwk = {
  kty: 'RSA';
  use?: 'sig';
  alg?: string;
  kid?: string;
  n: string;
  e: string;
  d: string;
  p: string;
  q: string;
  dp: string;
  dq: string;
  qi: string;
};

export type OidcJwks = {
  keys: OidcRsaPrivateJwk[];
};

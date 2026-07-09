/**
 * OIDC 交互桥接契约。
 *
 * identity/auth/interaction 是 better-auth（认证）与 node-oidc-provider（协议）之间的唯一桥接点：
 * - security/oidc 实现本接口（封装 provider.interactionDetails / interactionFinished）
 * - identity/auth/interaction 消费本接口，完成"校验账密 → 结束交互"
 *
 * 双方都不直接 import 对方实现，只依赖这一个契约，避免两个域缠在一起。
 * req/res 用 unknown 以避免 contracts 依赖 express 类型。
 */
export const OIDC_INTERACTION = Symbol('OIDC_INTERACTION');

export interface OidcInteractionDetails {
  uid: string;
  prompt: { name: string; reasons?: string[] };
  params: Record<string, unknown>;
  session?: { accountId?: string } | null;
}

export interface OidcLoginResult {
  accountId: string;
  remember?: boolean;
}

export interface IOidcInteraction {
  /** 读取 IAM OIDC SSO 会话是否已登录（读 _session cookie）。 */
  getSessionAccountId(req: unknown, res: unknown): Promise<string | null>;

  /** 读取当前交互详情（对应 provider.interactionDetails）。 */
  getDetails(req: unknown, res: unknown): Promise<OidcInteractionDetails>;

  /** 按 uid 读取仍存活的 interaction（不依赖 _interaction cookie）。 */
  findInteractionByUid(uid: string): Promise<OidcInteractionDetails | null>;

  /**
   * localhost 多 Tab：把请求上的 `_interaction` 锁定为指定 uid（含签名）。
   * oidc-provider 读的是带 `.sig` 的签名 cookie，裸写 uid 会导致 interaction_expired。
   */
  pinInteractionCookie(req: unknown, res: unknown, uid: string): Promise<void>;

  /**
   * 按 path uid 读取详情：先 pin 签名 cookie，再 interactionDetails。
   * 若 interaction 仍在但关联 SSO session 已被清掉，会剥离陈旧 session 引用后重试（登录页可继续）。
   */
  getDetailsByUid(req: unknown, res: unknown, uid: string): Promise<OidcInteractionDetails>;

  /** 完成登录交互，回到授权流程（对应 provider.interactionFinished）。 */
  finishLogin(req: unknown, res: unknown, result: OidcLoginResult): Promise<void>;

  /** 完成 consent 交互（自动授权 scope），演示环境跳过授权确认页。 */
  finishConsent(req: unknown, res: unknown): Promise<void>;

  /** consentMode=never 时自动完成 consent，否则需用户确认。 */
  shouldAutoConsent(clientId: string): Promise<boolean>;

  /** 用户取消 / 失败时中止交互。 */
  abort(req: unknown, res: unknown, error: string, description?: string): Promise<void>;
}

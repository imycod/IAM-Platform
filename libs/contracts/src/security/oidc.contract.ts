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

  /** 完成登录交互，回到授权流程（对应 provider.interactionFinished）。 */
  finishLogin(req: unknown, res: unknown, result: OidcLoginResult): Promise<void>;

  /** 完成 consent 交互（自动授权 scope），演示环境跳过授权确认页。 */
  finishConsent(req: unknown, res: unknown): Promise<void>;

  /** 用户取消 / 失败时中止交互。 */
  abort(req: unknown, res: unknown, error: string, description?: string): Promise<void>;
}

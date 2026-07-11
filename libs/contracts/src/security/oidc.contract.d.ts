export declare const OIDC_INTERACTION: unique symbol;
export interface OidcInteractionDetails {
    uid: string;
    prompt: {
        name: string;
        reasons?: string[];
    };
    params: Record<string, unknown>;
    session?: {
        accountId?: string;
    } | null;
}
export interface OidcLoginResult {
    accountId: string;
    remember?: boolean;
}
export interface IOidcInteraction {
    getSessionAccountId(req: unknown, res: unknown): Promise<string | null>;
    getDetails(req: unknown, res: unknown): Promise<OidcInteractionDetails>;
    findInteractionByUid(uid: string): Promise<OidcInteractionDetails | null>;
    finishLogin(req: unknown, res: unknown, result: OidcLoginResult, uid: string): Promise<void>;
    finishConsent(req: unknown, res: unknown, uid: string): Promise<void>;
    shouldAutoConsent(clientId: string): Promise<boolean>;
    abort(req: unknown, res: unknown, error: string, description?: string): Promise<void>;
}

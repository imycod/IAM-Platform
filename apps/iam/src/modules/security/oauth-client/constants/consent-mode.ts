export const CONSENT_MODES = ['always', 'first_time', 'never'] as const;

export type ConsentMode = (typeof CONSENT_MODES)[number];

/** 默认首次访问需用户授权确认（Google 式）；IAM 自身管理端等可显式设为 never。 */
export const DEFAULT_CONSENT_MODE: ConsentMode = 'first_time';

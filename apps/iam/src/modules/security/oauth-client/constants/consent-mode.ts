export const CONSENT_MODES = ['always', 'first_time', 'never'] as const;

export type ConsentMode = (typeof CONSENT_MODES)[number];

export const DEFAULT_CONSENT_MODE: ConsentMode = 'never';

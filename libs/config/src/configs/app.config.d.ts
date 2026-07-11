export interface AppConfig {
    port: number;
    env: string;
    url: string;
    globalPrefix: string;
}
export declare const appConfig: (() => AppConfig) & import("@nestjs/config").ConfigFactoryKeyHost<AppConfig>;

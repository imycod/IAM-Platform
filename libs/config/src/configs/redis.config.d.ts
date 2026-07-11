export interface RedisConfig {
    host: string;
    port: number;
}
export declare const redisConfig: (() => RedisConfig) & import("@nestjs/config").ConfigFactoryKeyHost<RedisConfig>;

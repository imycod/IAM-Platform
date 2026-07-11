export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}
export declare const databaseConfig: (() => DatabaseConfig) & import("@nestjs/config").ConfigFactoryKeyHost<DatabaseConfig>;

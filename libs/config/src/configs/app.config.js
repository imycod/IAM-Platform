"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
const config_1 = require("@nestjs/config");
exports.appConfig = (0, config_1.registerAs)('app', () => ({
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    env: process.env.NODE_ENV ?? 'development',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
}));
//# sourceMappingURL=app.config.js.map
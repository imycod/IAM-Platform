"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            message = typeof res === 'string' ? res : res.message ?? res;
        }
        else if (exception instanceof typeorm_1.QueryFailedError) {
            const driverError = exception.driverError;
            if (driverError?.code === 'ER_DUP_ENTRY') {
                status = common_1.HttpStatus.CONFLICT;
                message = mapDuplicateEntryMessage(exception.message);
            }
        }
        if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
        }
        response.status(status).json({
            code: status,
            message,
            data: null,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
function mapDuplicateEntryMessage(rawMessage) {
    const match = rawMessage.match(/Duplicate entry '([^']+)'/);
    const value = match?.[1];
    if (value?.includes('@')) {
        return '该邮箱已被注册';
    }
    if (value && /^\+?[0-9]{6,20}$/.test(value)) {
        return '该手机号已被注册';
    }
    return '数据已存在，请勿重复提交';
}
//# sourceMappingURL=all-exceptions.filter.js.map
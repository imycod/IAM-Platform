"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicImport = dynamicImport;
const nativeDynamicImport = new Function('specifier', 'return import(specifier)');
function dynamicImport(specifier) {
    return nativeDynamicImport(specifier);
}
//# sourceMappingURL=dynamic-import.util.js.map
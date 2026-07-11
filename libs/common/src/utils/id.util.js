"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
const ulid_1 = require("ulid");
function generateId() {
    return (0, ulid_1.ulid)();
}
//# sourceMappingURL=id.util.js.map
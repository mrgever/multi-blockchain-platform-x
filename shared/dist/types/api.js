"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketMessageType = void 0;
var WebSocketMessageType;
(function (WebSocketMessageType) {
    WebSocketMessageType["TRANSACTION_UPDATE"] = "TRANSACTION_UPDATE";
    WebSocketMessageType["BALANCE_UPDATE"] = "BALANCE_UPDATE";
    WebSocketMessageType["NEW_BLOCK"] = "NEW_BLOCK";
    WebSocketMessageType["PRICE_UPDATE"] = "PRICE_UPDATE";
    WebSocketMessageType["ERROR"] = "ERROR";
})(WebSocketMessageType || (exports.WebSocketMessageType = WebSocketMessageType = {}));
//# sourceMappingURL=api.js.map
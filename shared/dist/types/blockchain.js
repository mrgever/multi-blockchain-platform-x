"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = exports.TokenType = exports.Blockchain = void 0;
var Blockchain;
(function (Blockchain) {
    Blockchain["TON"] = "TON";
    Blockchain["ETHEREUM"] = "ETHEREUM";
    Blockchain["BITCOIN"] = "BITCOIN";
    Blockchain["DOGECOIN"] = "DOGECOIN";
})(Blockchain || (exports.Blockchain = Blockchain = {}));
var TokenType;
(function (TokenType) {
    TokenType["NATIVE"] = "NATIVE";
    TokenType["ERC20"] = "ERC20";
    TokenType["TRC20"] = "TRC20";
})(TokenType || (exports.TokenType = TokenType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["CONFIRMED"] = "CONFIRMED";
    TransactionStatus["FAILED"] = "FAILED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
//# sourceMappingURL=blockchain.js.map
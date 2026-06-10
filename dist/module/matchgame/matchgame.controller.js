"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const catchAsync_1 = __importDefault(require("../../utility/catchAsync"));
const matchgame_services_1 = __importDefault(require("./matchgame.services"));
const http_status_1 = __importDefault(require("http-status"));
const sendRespone_1 = __importDefault(require("../../utility/sendRespone"));
const recordedGameOneData = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield matchgame_services_1.default.recordedGameOneDataIntoDB(req.user.id, req.body);
    (0, sendRespone_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.CREATED,
        message: "Successfully  Recorded",
        data: result
    });
}));
const myGameLevel = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield matchgame_services_1.default.myGameLevelIntoDb(req.user.id);
    (0, sendRespone_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Successfully Find My Game Level",
        data: result
    });
}));
const deleteMatchGame = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield matchgame_services_1.default.deleteMatchGameIntoDb(req.user.id, req.params.id);
    (0, sendRespone_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Successfully  Delete Match Game",
        data: result
    });
}));
const trackingSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield matchgame_services_1.default.trackingSummaryIntoDb(req.query, req.user.id);
    (0, sendRespone_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Successfully Find By  Match Game Summary",
        data: result
    });
}));
const sendOTP = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield matchgame_services_1.default.sendOTPIntoDb(req.body.phone);
    (0, sendRespone_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: "Successfully Find By  Match Game Summary",
        data: result
    });
}));
const matchGameController = {
    recordedGameOneData,
    myGameLevel,
    deleteMatchGame,
    trackingSummary,
    sendOTP
};
exports.default = matchGameController;

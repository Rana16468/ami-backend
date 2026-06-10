"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_constant_1 = require("../user/user.constant");
const validationRequest_1 = __importDefault(require("../../middleware/validationRequest"));
const matchgame_validations_1 = __importDefault(require("./matchgame.validations"));
const matchgame_controller_1 = __importDefault(require("./matchgame.controller"));
const route = express_1.default.Router();
route.post("/recorded_match_game_data", (0, auth_1.default)(user_constant_1.USER_ROLE.admin, user_constant_1.USER_ROLE.superAdmin, user_constant_1.USER_ROLE.user), (0, validationRequest_1.default)(matchgame_validations_1.default.createMatchGameZodSchema), matchgame_controller_1.default.recordedGameOneData);
route.get("/my_game_level", (0, auth_1.default)(user_constant_1.USER_ROLE.admin, user_constant_1.USER_ROLE.superAdmin, user_constant_1.USER_ROLE.user), matchgame_controller_1.default.myGameLevel);
route.delete("/delete_match_game/:id", (0, auth_1.default)(user_constant_1.USER_ROLE.admin, user_constant_1.USER_ROLE.superAdmin, user_constant_1.USER_ROLE.user), matchgame_controller_1.default.deleteMatchGame);
route.get("/tracking_my_match_game_summary", (0, auth_1.default)(user_constant_1.USER_ROLE.user, user_constant_1.USER_ROLE.admin), matchgame_controller_1.default.trackingSummary);
//route.post("/send-otp",matchGameController.sendOTP )
const matchGameRoute = route;
exports.default = matchGameRoute;

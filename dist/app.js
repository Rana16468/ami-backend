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
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./app/config"));
const node_cron_1 = __importDefault(require("node-cron"));
const cors_1 = __importDefault(require("cors"));
// import cron from 'node-cron';
const router_1 = __importDefault(require("./router"));
const notFound_1 = __importDefault(require("./middleware/notFound"));
const globalErrorHandelar_1 = __importDefault(require("./middleware/globalErrorHandelar"));
const auto_delete_unverified_user_1 = __importDefault(require("./utility/auto_delete_unverified_user"));
const catchError_1 = __importDefault(require("./app/error/catchError"));
const auto_delete_notification_1 = __importDefault(require("./utility/auto_delete_notification"));
const app = (0, express_1.default)();
// ======= Middlewares =======
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(config_1.default.file_path, express_1.default.static(path_1.default.join(__dirname, 'public')));
// ======= Test Route =======
app.get("/", (_req, res) => {
    res.send({
        status: true,
        message: "Welcome to rishabhbhard-backend Server is running",
    });
});
node_cron_1.default.schedule("*/5 * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, auto_delete_unverified_user_1.default)();
    }
    catch (error) {
        (0, catchError_1.default)(error, '[Cron] Error in subscription expiry cron job:');
    }
}));
node_cron_1.default.schedule("*/30 * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, auto_delete_notification_1.default)();
    }
    catch (error) {
        (0, catchError_1.default)(error, "[Cron] Error in notification auto delete cron job:");
    }
}));
//autoDeleteChatBotInfo 
// cron.schedule("*/30 * * * *", async () => {
//   try {
//    const result= await autoDeleteChatBotInfo();
//    console.log(result);
//   } catch (error) {
//     catchError(error, "[Cron] Error in chatbot auto delete cron job:");
//   }
// });
// ======= API Routes =======
app.use("/api/v1", router_1.default);
// ======= 404 & Global Error Handler =======
app.use(notFound_1.default);
app.use(globalErrorHandelar_1.default);
exports.default = app;

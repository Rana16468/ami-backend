"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../app/error/ApiError"));
const matchgame_model_1 = __importDefault(require("./matchgame.model"));
const mongoose_1 = __importStar(require("mongoose"));
const catchError_1 = __importDefault(require("../../app/error/catchError"));
const recordedGameOneDataIntoDB = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield matchgame_model_1.default.create(Object.assign(Object.assign({}, payload), { userId: new mongoose_1.Types.ObjectId(userId) }));
        if (!result) {
            throw new ApiError_1.default(http_status_1.default.NOT_EXTENDED, "Issue while recording match game data", "");
        }
        return {
            status: true,
            message: "Successfully recorded"
        };
    }
    catch (error) {
        throw error; // ✅ service must throw
    }
});
const myGameLevelIntoDb = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield matchgame_model_1.default
            .findOne({ userId })
            .sort({ createdAt: -1 }).select("game_type level total_stages_in_level")
            .lean();
        return result;
    }
    catch (error) {
        (0, catchError_1.default)(error);
    }
});
const deleteMatchGameIntoDb = (userId, id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if document exists for this user
        const isExistGame = yield matchgame_model_1.default.exists({ userId, _id: id });
        if (!isExistGame) {
            throw new ApiError_1.default(http_status_1.default.NOT_EXTENDED, "This game data does not exist", "");
        }
        // Delete the document
        const result = yield matchgame_model_1.default.deleteOne({ userId, _id: id });
        if (result.deletedCount !== 1) {
            throw new ApiError_1.default(http_status_1.default.NOT_EXTENDED, "Failed to delete the game data", "");
        }
        return {
            status: true,
            message: "Successfully deleted",
        };
    }
    catch (error) {
        (0, catchError_1.default)(error);
    }
});
const trackingSummaryIntoDb = (query, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract pagination parameters from query
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;
        const period = query.period || 'all';
        // Calculate date filter based on period
        let dateFilter;
        const now = new Date();
        switch (period) {
            case 'week':
                dateFilter = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                dateFilter = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            case 'all':
            default:
                dateFilter = undefined;
                break;
        }
        // Build match condition
        const matchCondition = { userId: new mongoose_1.default.Types.ObjectId(userId) };
        if (dateFilter) {
            matchCondition.createdAt = { $gte: dateFilter };
        }
        // Aggregation pipeline for summary statistics
        const summaryPipeline = yield matchgame_model_1.default.aggregate([
            {
                $match: matchCondition
            },
            {
                $facet: {
                    // Overall statistics
                    stats: [
                        {
                            $group: {
                                _id: null,
                                total_games_played: { $sum: 1 },
                                total_time_spent_seconds: { $sum: "$time_spent_seconds" },
                                average_score: { $avg: "$score_percentage" },
                                best_score: { $max: "$score_percentage" },
                                all_scores: { $push: "$score_percentage" }
                            }
                        }
                    ],
                    // Chart data grouped by date
                    chart_data: [
                        {
                            $group: {
                                _id: {
                                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                                },
                                score: { $avg: "$score_percentage" },
                                games_count: { $sum: 1 }
                            }
                        },
                        {
                            $sort: { _id: 1 }
                        },
                        {
                            $project: {
                                _id: 0,
                                date: "$_id",
                                score: { $round: "$score" },
                                games_count: 1
                            }
                        }
                    ],
                    // Recent sessions with pagination from query
                    recent_sessions: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                id: "$_id",
                                level: 1,
                                score: 1,
                                correct_count: 1,
                                wrong_count: 1,
                                score_percentage: 1,
                                time_spent_seconds: 1,
                                level_completed: 1,
                                played_at: "$createdAt",
                                _id: 0
                            }
                        }
                    ],
                    // For cognitive improvement calculation
                    chronological_sessions: [
                        { $sort: { createdAt: 1 } },
                        {
                            $project: {
                                score_percentage: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            }
        ]);
        const result = summaryPipeline[0];
        const stats = result.stats[0] || {
            total_games_played: 0,
            total_time_spent_seconds: 0,
            average_score: 0,
            best_score: 0
        };
        // Calculate cognitive improvement percentage
        const chronological = result.chronological_sessions || [];
        const halfPoint = Math.floor(chronological.length / 2);
        const olderHalf = chronological.slice(0, halfPoint);
        const recentHalf = chronological.slice(halfPoint);
        const olderAvg = olderHalf.length > 0
            ? olderHalf.reduce((sum, r) => sum + r.score_percentage, 0) / olderHalf.length
            : 0;
        const recentAvg = recentHalf.length > 0
            ? recentHalf.reduce((sum, r) => sum + r.score_percentage, 0) / recentHalf.length
            : 0;
        const cognitive_improvement_percentage = olderAvg > 0
            ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100)
            : 0;
        // Get total count for meta
        const totalCount = stats.total_games_played;
        return {
            total_games_played: stats.total_games_played,
            total_time_spent_minutes: Math.round(stats.total_time_spent_seconds / 60),
            average_score: Math.round(stats.average_score || 0),
            best_score: stats.best_score || 0,
            cognitive_improvement_percentage,
            game_performance_percentage: Math.round(stats.average_score || 0),
            chart_data: result.chart_data || [],
            recent_sessions: result.recent_sessions || [],
            meta: {
                page,
                limit,
                total: totalCount,
                totalPage: Math.ceil(totalCount / limit)
            }
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, "Tracking summary fetch failed", error);
    }
});
// const TWILIO_API_KEY_SID = "";
// const TWILIO_API_KEY_SECRET = "";
// const TWILIO_ACCOUNT_SID = "";
// const TWILIO_VERIFY_SERVICE_SID = "";
// const client = twilio(
//   TWILIO_API_KEY_SID,
//   TWILIO_API_KEY_SECRET,
//   {
//     accountSid: TWILIO_ACCOUNT_SID,
//   }
// );
const sendOTPIntoDb = (phone) => __awaiter(void 0, void 0, void 0, function* () {
    // try {
    //   const verification = await client.verify.v2
    //     .services(TWILIO_VERIFY_SERVICE_SID)
    //     .verifications.create({
    //       to: phone, // +8801712345678
    //       channel: "sms",
    //     });
    //   return {
    //     success: true,
    //     sid: verification.sid,
    //     status: verification.status,
    //     to: verification.to,
    //   };
    // } catch (error: any) {
    //   throw new Error(error?.message || "Failed to send OTP");
    // }
});
const matchGameServices = {
    recordedGameOneDataIntoDB,
    myGameLevelIntoDb,
    deleteMatchGameIntoDb,
    trackingSummaryIntoDb,
    sendOTPIntoDb
};
exports.default = matchGameServices;

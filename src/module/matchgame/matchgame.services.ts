import httpStatus from "http-status";
import ApiError from "../../app/error/ApiError";
import { TMatchGame } from "./matchgame.interface";
import matchgames from "./matchgame.model";
import mongoose, { Types } from "mongoose";
import catchError from "../../app/error/catchError";


const recordedGameOneDataIntoDB = async (
  userId: string,
  payload: Omit<TMatchGame, "userId">
) => {
  try {
    const result = await matchgames.create({
      ...payload,
      userId: new Types.ObjectId(userId),
    });

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        "Issue while recording match game data",
        ""
      );
    }

    return {
      status: true,
      message: "Successfully recorded"
     
    };
  } catch (error) {
    throw error; // ✅ service must throw
  }
};


const myGameLevelIntoDb = async (userId: string) => {
  try {
    const result = await matchgames
      .findOne({ userId })          
      .sort({ createdAt: -1 }).select("game_type level total_stages_in_level")     
      .lean();                   

    return result;
  } catch (error) {
    catchError(error);
  }
};



const deleteMatchGameIntoDb = async (userId: string, id: string) => {
  try {
    // Check if document exists for this user
    const isExistGame = await matchgames.exists({ userId, _id: id });

    if (!isExistGame) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        "This game data does not exist",
        ""
      );
    }

    // Delete the document
    const result = await matchgames.deleteOne({ userId, _id: id });

    if (result.deletedCount !== 1) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        "Failed to delete the game data",
        ""
      );
    }

    return {
      status: true,
      message: "Successfully deleted",
    };
  } catch (error) {
    catchError(error);
  }
};

const trackingSummaryIntoDb = async (
  query: Record<string, unknown>,
  userId: string
) => {
  try {
    // Extract pagination parameters from query
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const period = query.period as string || 'all';


    // Calculate date filter based on period
    let dateFilter: Date | undefined;
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
    const matchCondition: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (dateFilter) {
      matchCondition.createdAt = { $gte: dateFilter };
    }

    // Aggregation pipeline for summary statistics
    const summaryPipeline = await matchgames.aggregate([
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
      ? olderHalf.reduce((sum: number, r: any) => sum + r.score_percentage, 0) / olderHalf.length
      : 0;
    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((sum: number, r: any) => sum + r.score_percentage, 0) / recentHalf.length
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
    
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Tracking summary fetch failed",
      error
    );
  }
};
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

 const sendOTPIntoDb = async (phone: string) => {
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
};


const matchGameServices = {
  recordedGameOneDataIntoDB,
  myGameLevelIntoDb,
   deleteMatchGameIntoDb,
    trackingSummaryIntoDb ,
    sendOTPIntoDb 
};

export default matchGameServices;

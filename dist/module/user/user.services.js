"use strict";
// import { sendEmail } from './../../utility/sendEmail';
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
exports.generateUniqueOTP = void 0;
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../app/error/ApiError"));
const sendvarificationData_1 = __importDefault(require("../../utility/emailcontext/sendvarificationData"));
// import sendEmail from '../../utility/sendEmail';
const user_model_1 = __importDefault(require("./user.model"));
const user_constant_1 = require("./user.constant");
const mongoose_1 = __importDefault(require("mongoose"));
const jwtHelpers_1 = require("../../app/helper/jwtHelpers");
const config_1 = __importDefault(require("../../app/config"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const catchError_1 = __importDefault(require("../../app/error/catchError"));
const connectSocket_1 = require("../../socket/connectSocket");
const notification_model_1 = __importDefault(require("../notification/notification.model"));
const sendOTP_1 = __importDefault(require("../../utility/SMS/sendOTP"));
const sendEmail_1 = __importDefault(require("../../utility/sendEmail"));
const generateUniqueOTP = () => __awaiter(void 0, void 0, void 0, function* () {
    const MAX_ATTEMPTS = 10;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const otp = Math.floor(10000 + Math.random() * 90000);
        const existingUser = yield user_model_1.default.findOne({ verificationCode: otp });
        if (!existingUser) {
            return otp;
        }
    }
    throw new ApiError_1.default(http_status_1.default.NOT_EXTENDED, 'Failed to generate a unique OTP after multiple attempts', '');
});
exports.generateUniqueOTP = generateUniqueOTP;
const createUserIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const io = (0, connectSocket_1.getSocketIO)();
        const otp = yield (0, exports.generateUniqueOTP)();
        const isExistUser = yield user_model_1.default.findOne({
            phoneNumber: payload.phoneNumber,
            isVerify: true,
            status: user_constant_1.USER_ACCESSIBILITY.isProgress,
        }, { _id: 1, email: 1, phoneNumber: 1, role: 1 });
        if (isExistUser) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "This phone number already exists", '');
        }
        payload.verificationCode = otp;
        payload.isVerify = false;
        const authBuilder = new user_model_1.default(payload);
        const result = yield authBuilder.save({ session });
        yield session.commitTransaction();
        // -------------------------------
        // Notification + Socket (outside transaction)
        // -------------------------------
        const title = `New User Registration: ${payload.nickname}`;
        const message = `A new user has registered with the  phone number: ${payload.phoneNumber}.`;
        io.emit(`user::admin`, {
            id: Date.now(),
            title,
            message,
            timestamp: new Date().toISOString(),
            sender: "system",
        });
        yield notification_model_1.default.create({
            title,
            message,
            userId: result._id,
        });
        return {
            status: true,
            message: "Successfully created an account",
        };
    }
    catch (error) {
        yield session.abortTransaction();
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, "Server unavailable", error);
    }
    finally {
        session.endSession();
    }
});
const userVerificationIntoDb = (verificationCode) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!verificationCode) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Verification code is required', '');
        }
        const updatedUser = yield user_model_1.default.findOneAndUpdate({ verificationCode }, {
            isVerify: true,
        }, { new: true });
        if (!updatedUser) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'Invalid verification code', '');
        }
        const jwtPayload = {
            id: updatedUser.id,
            role: updatedUser.role,
            email: updatedUser.email,
        };
        let accessToken = null;
        if (updatedUser.isVerify) {
            accessToken = jwtHelpers_1.jwtHelpers.generateToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.expires_in);
        }
        return {
            message: 'User verification successful',
            accessToken,
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, 'Verification auth error', error);
    }
});
const changePasswordIntoDb = (payload, id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isUserExist = yield user_model_1.default.findOne({
            $and: [
                { _id: id },
                { isVerify: true },
                { status: user_constant_1.USER_ACCESSIBILITY.isProgress },
                { isDelete: false },
            ],
        }, { password: 1 });
        if (!isUserExist) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'User not found', '');
        }
        if (!(yield user_model_1.default.isPasswordMatched(payload.oldpassword, isUserExist === null || isUserExist === void 0 ? void 0 : isUserExist.password))) {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, 'Old password does not match', '');
        }
        const newHashedPassword = yield bcrypt_1.default.hash(payload.newpassword, Number(config_1.default.bcrypt_salt_rounds));
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(id, { password: newHashedPassword }, { new: true, upsert: true });
        if (!updatedUser) {
            throw new ApiError_1.default(http_status_1.default.FORBIDDEN, 'password  change database error', '');
        }
        return {
            success: true,
            message: 'Password updated successfully',
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, 'Password change failed', error);
    }
});
// forgot password
const forgotPasswordIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1️⃣ Check user first
        const isExistUser = yield user_model_1.default.findOne({
            phoneNumber: payload.phoneNumber,
            isVerify: true,
            status: user_constant_1.USER_ACCESSIBILITY.isProgress,
            isDelete: false,
        }, { _id: 1 });
        if (!isExistUser) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found", "");
        }
        // 2️⃣ Send OTP
        const sendOtp = yield sendOTP_1.default.sendOTP(payload.phoneNumber);
        if (!sendOtp || sendOtp.status !== "pending") {
            throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to send OTP", "");
        }
        return {
            success: true,
            message: "OTP sent successfully",
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, (error === null || error === void 0 ? void 0 : error.message) || "Forgot password failed", error);
    }
});
const forgotPasswordEmailIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("email", payload.email);
    try {
        let emailString;
        if (typeof payload === 'string') {
            emailString = payload;
        }
        else if (payload && typeof payload === 'object' && 'email' in payload) {
            emailString = payload.email;
        }
        else {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, 'Invalid email format', '');
        }
        const isExistUser = yield user_model_1.default.findOne({
            $and: [
                { email: emailString },
                { isVerify: true },
                { status: user_constant_1.USER_ACCESSIBILITY.isProgress },
                { isDelete: false },
            ],
        }, { _id: 1, provider: 1 });
        if (!isExistUser) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'User not found', '');
        }
        const otp = yield (0, exports.generateUniqueOTP)();
        const result = yield user_model_1.default.findOneAndUpdate({ _id: isExistUser._id }, { verificationCode: otp }, {
            new: true,
            upsert: true,
            projection: { _id: 1, email: 1 },
        });
        if (!result) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'OTP forgot section issues', '');
        }
        try {
            const result = yield (0, sendEmail_1.default)('amsohelrana.me@gmail.com', sendvarificationData_1.default.sendVerificationData(emailString, otp, ' Forgot Password Email'), 'Forgot Password Verification OTP Code');
            console.log(result);
            // await sendEmail({ subject:"Forgot Password Email",to:"amsohelrana.me@gmail.com", name:"sohel Rana",  htmlContent:emailcontext.sendVerificationData(emailString, otp, 'Forgot Password Email')})
            //    const result = await sendEmail({
            //   to: "amsohelrana.me@gmail.com",
            //   subject: "Welcome to our platform",
            //   htmlContent: `
            //     <h1>Hello!</h1>
            //     <p>Your Brevo integration is working successfully.</p>
            //   `,
            // });
            // console.log(result);
        }
        catch (emailError) {
            throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, 'Failed to send verification email', emailError);
        }
        return { status: true, message: 'Checked Your Email' };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, 'Password change failed', error);
    }
});
const verificationForgotUserIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber, verificationCode } = payload;
        // const isVerified = await twilio_sms_services.verifyOTP(
        //   phoneNumber,
        //   verificationCode
        // );
        // if (!isVerified) {
        //   throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP", "");
        // }
        // 2️⃣ Find user
        const isExistOtp = yield user_model_1.default.findOne({
            phoneNumber,
            isVerify: true,
            isDelete: false,
            status: user_constant_1.USER_ACCESSIBILITY.isProgress,
        }, { _id: 1, email: 1, role: 1 });
        if (!isExistOtp) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "User not found", "");
        }
        // 3️⃣ Generate JWT
        const jwtPayload = {
            id: isExistOtp._id.toString(),
            role: isExistOtp.role,
            email: isExistOtp.email,
        };
        const accessToken = jwtHelpers_1.jwtHelpers.generateToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.expires_in);
        // 4️⃣ Cleanup (optional)
        yield user_model_1.default.updateOne({ _id: isExistOtp._id }, { $unset: { verificationCode: "" } });
        return accessToken;
    }
    catch (error) {
        if (error instanceof ApiError_1.default)
            throw error;
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, "OTP verification failed", error);
    }
});
const resetPasswordIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isExistUser = yield user_model_1.default.findOne({
            $and: [
                { _id: payload.userId,
                },
                { isVerify: true },
                { status: user_constant_1.USER_ACCESSIBILITY.isProgress },
            ],
        }, { _id: 1 });
        if (!isExistUser) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'some issues by the  reset password section', '');
        }
        payload.password = yield bcrypt_1.default.hash(payload.password, Number(config_1.default.bcrypt_salt_rounds));
        const result = yield user_model_1.default.findByIdAndUpdate(isExistUser._id, { password: payload.password }, { new: true, upsert: true });
        return result && { status: true, message: 'successfully reset password' };
    }
    catch (error) {
        (0, catchError_1.default)(error);
    }
});
const googleAuthIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield user_model_1.default.findOne({
            email: payload.email,
            isVerify: true
        }, { _id: 1, role: 1, email: 1, isVerify: 1, });
        let jwtPayload;
        if (!user) {
            payload.isVerify = true;
            const newUser = new user_model_1.default(payload);
            user = yield newUser.save();
        }
        jwtPayload = {
            id: user._id.toString(),
            role: user.role,
            email: user.email,
        };
        if (user.isVerify) {
            const accessToken = jwtHelpers_1.jwtHelpers.generateToken(jwtPayload, config_1.default.jwt_access_secret, config_1.default.expires_in);
            const refreshToken = jwtHelpers_1.jwtHelpers.generateToken(jwtPayload, config_1.default.jwt_refresh_secret, config_1.default.refresh_expires_in);
            // Update FCM token if provided
            if (payload === null || payload === void 0 ? void 0 : payload.fcm) {
                yield user_model_1.default.findByIdAndUpdate(user._id, { $set: { fcm: payload.fcm } }, { new: true, upsert: true });
            }
            return { accessToken, refreshToken };
        }
        // If user is not verified
        return { accessToken: null, refreshToken: null };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.SERVICE_UNAVAILABLE, error.message || "Google auth failed", error);
    }
});
const resendVerificationOtpIntoDb = (email) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ 1. Check if the user exists and is not yet verified
        const user = yield user_model_1.default.findOne({
            email,
            status: user_constant_1.USER_ACCESSIBILITY.isProgress,
        }, { _id: 1, isVerify: 1 });
        if (!user) {
            throw new ApiError_1.default(http_status_1.default.NOT_FOUND, "This user does not exist in our database.", "");
        }
        if (user.isVerify) {
            return {
                status: false,
                message: "This user is already verified."
            };
        }
        const otp = yield (0, exports.generateUniqueOTP)();
        // ✅ 3. Update verification code
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(user._id, { verificationCode: otp }, { new: true });
        if (!updatedUser) {
            throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update verification code.", "");
        }
        yield (0, sendEmail_1.default)(email, sendvarificationData_1.default.sendVerificationData(email, otp, 'User Verification Email'), 'Verification OTP Code');
        return { status: true, message: "successfully send email " };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to resend verification OTP.", error);
    }
});
const getUserGrowthIntoDb = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const year = query.year ? parseInt(query.year) : new Date().getFullYear();
        const previousYear = year - 1;
        // Get current year stats
        const currentYearStats = yield user_model_1.default.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
                    },
                },
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    month: "$_id.month",
                    count: 1,
                    _id: 0,
                },
            },
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: "$count" },
                    data: { $push: { month: "$month", count: "$count" } },
                },
            },
            {
                $project: {
                    totalCount: 1,
                    months: {
                        $map: {
                            input: { $range: [1, 13] },
                            as: "m",
                            in: {
                                year: year,
                                month: "$$m",
                                count: {
                                    $let: {
                                        vars: {
                                            matched: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$data",
                                                            as: "d",
                                                            cond: { $eq: ["$$d.month", "$$m"] },
                                                        },
                                                    },
                                                    0,
                                                ],
                                            },
                                        },
                                        in: { $ifNull: ["$$matched.count", 0] },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ]);
        // Get previous year total count
        const previousYearStats = yield user_model_1.default.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${previousYear}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${previousYear}-12-31T23:59:59.999Z`),
                    },
                },
            },
            {
                $count: "totalCount",
            },
        ]);
        const currentYearTotal = ((_a = currentYearStats[0]) === null || _a === void 0 ? void 0 : _a.totalCount) || 0;
        const previousYearTotal = ((_b = previousYearStats[0]) === null || _b === void 0 ? void 0 : _b.totalCount) || 0;
        // Calculate year-over-year growth percentage
        let yearlyGrowth = 0;
        if (previousYearTotal > 0) {
            yearlyGrowth = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
        }
        else if (currentYearTotal > 0) {
            yearlyGrowth = 100; // If no users in previous year but users exist in current year
        }
        // Extract monthly stats
        const monthlyStats = ((_c = currentYearStats[0]) === null || _c === void 0 ? void 0 : _c.months) || [];
        return {
            monthlyStats,
            yearlyGrowth: parseFloat(yearlyGrowth.toFixed(2)),
            year,
        };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to fetch user creation stats", error);
    }
});
const createAdminAccountIntoDb = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isExistUser = yield user_model_1.default.exists({
            email: payload.email,
            isVerify: true,
        });
        if (isExistUser) {
            throw new ApiError_1.default(http_status_1.default.CONFLICT, "This user already exists in our system", "");
        }
        const userData = Object.assign(Object.assign({}, payload), { isVerify: true });
        yield user_model_1.default.create(userData);
        const title = `New Researcher Registration: ${payload.nickname}`;
        const message = `A new researcher user registered with phone number: ${payload.phoneNumber}.`;
        const io = (0, connectSocket_1.getSocketIO)();
        // 7️⃣ Emit socket event
        io.emit("user::admin", {
            id: Date.now(),
            title,
            message,
            timestamp: new Date().toISOString(),
            sender: "system",
        });
        return {
            status: true,
            message: "Successfully created an admin account",
        };
    }
    catch (error) {
        (0, catchError_1.default)(error);
    }
});
const UserServices = {
    createUserIntoDb,
    userVerificationIntoDb,
    changePasswordIntoDb,
    forgotPasswordIntoDb,
    resetPasswordIntoDb,
    verificationForgotUserIntoDb,
    googleAuthIntoDb,
    resendVerificationOtpIntoDb,
    getUserGrowthIntoDb,
    createAdminAccountIntoDb,
    forgotPasswordEmailIntoDb
};
exports.default = UserServices;

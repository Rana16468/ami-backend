// import { sendEmail } from './../../utility/sendEmail';

import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import emailcontext from '../../utility/emailcontext/sendvarificationData';
// import sendEmail from '../../utility/sendEmail';
import users from './user.model';
import { USER_ACCESSIBILITY } from './user.constant';
import { TUser } from './user.interface';
import mongoose from 'mongoose';
import { jwtHelpers } from '../../app/helper/jwtHelpers';
import config from '../../app/config';
import bcrypt from 'bcrypt';
import catchError from '../../app/error/catchError';
import { getSocketIO } from '../../socket/connectSocket';
import notifications from '../notification/notification.model';
import twilio_sms_services from '../../utility/SMS/sendOTP';
import sendEmail from '../../utility/sendEmail';


export const generateUniqueOTP = async (): Promise<number> => {
  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const otp = Math.floor(10000 + Math.random() * 90000);

    const existingUser = await users.findOne({ verificationCode: otp });

    if (!existingUser) {
      return otp;
    }
  }

  throw new ApiError(
    httpStatus.NOT_EXTENDED,
    'Failed to generate a unique OTP after multiple attempts',
    '',
  );
};

const createUserIntoDb = async (payload: TUser) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const io = getSocketIO() as any;
    const otp = await generateUniqueOTP();

    const isExistUser = await users.findOne(
      {
        phoneNumber: payload.phoneNumber,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1, email: 1, phoneNumber: 1, role: 1 }
    );

    if (isExistUser) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "This phone number already exists" , ''
      );
    }

    payload.verificationCode = otp;
    payload.isVerify = false;

    const authBuilder = new users(payload);
    const result = await authBuilder.save({ session });

    await session.commitTransaction();

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

    

    await notifications.create({
      title,
      message,
      userId: result._id,
    });

    return {
      status: true,
      message: "Successfully created an account",
    };
  } catch (error: any) {
    await session.abortTransaction();

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Server unavailable",
      error
    );
  } finally {
    session.endSession();
  }
};


const userVerificationIntoDb = async (verificationCode: number) => {
  try {
    if (!verificationCode) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Verification code is required',
        '',
      );
    }

    const updatedUser = await users.findOneAndUpdate(
      { verificationCode },
      {
        isVerify: true,
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Invalid verification code', '');
    }

    const jwtPayload = {
      id: updatedUser.id,
      role: updatedUser.role,
      email: updatedUser.email,
    };

    let accessToken: string | null = null;

    if (updatedUser.isVerify) {
      accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );
    }

    return {
      message: 'User verification successful',
      accessToken,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Verification auth error',
      error,
    );
  }
};

const changePasswordIntoDb = async (
  payload: {
    newpassword: string;
    oldpassword: string;
  },
  id: string,
) => {
  try {
    const isUserExist = await users.findOne(
      {
        $and: [
          { _id: id },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { password: 1 },
    ) as any;

    if (!isUserExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    if (
      !(await users.isPasswordMatched(
        payload.oldpassword,
        isUserExist?.password,
      ))
    ) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Old password does not match',
        '',
      );
    }

    const newHashedPassword = await bcrypt.hash(
      payload.newpassword,
      Number(config.bcrypt_salt_rounds),
    );

    const updatedUser = await users.findByIdAndUpdate(
      id,
      { password: newHashedPassword },
      { new: true, upsert: true },
    );
    if (!updatedUser) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'password  change database error',
        '',
      );
    }

    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};

// forgot password

const forgotPasswordIntoDb = async (payload: { phoneNumber: string }) => {
  try {
    // 1️⃣ Check user first
    const isExistUser = await users.findOne(
      {
        phoneNumber: payload.phoneNumber,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
        isDelete: false,
      },
      { _id: 1 }
    );

    if (!isExistUser) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    // 2️⃣ Send OTP
    const sendOtp = await twilio_sms_services.sendOTP(payload.phoneNumber);
   

    if (!sendOtp || sendOtp.status !== "pending") {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to send OTP",
        ""
      );
    }

  
    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      error?.message || "Forgot password failed",
      error
    );
  }
};

const forgotPasswordEmailIntoDb = async (payload:  { email: string }) => {
 


  console.log("email", payload.email)

  try {
    let emailString: string;

    if (typeof payload === 'string') {
      emailString = payload;
    } else if (payload && typeof payload === 'object' && 'email' in payload) {
      emailString = payload.email;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format', '');
    }

    const isExistUser = await users.findOne(
      {
        $and: [
          { email: emailString },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
          { isDelete: false },
        ],
      },
      { _id: 1, provider: 1 },
     
    );

    if (!isExistUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', '');
    }

    const otp = await generateUniqueOTP();

    const result = await users.findOneAndUpdate(
      { _id: isExistUser._id },
      { verificationCode: otp },
      {
        new: true,
        upsert: true,
        projection: { _id: 1, email: 1 },
       
      },
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'OTP forgot section issues', '');
    }

    try {
      const result=await sendEmail(
        'amsohelrana.me@gmail.com',
        emailcontext.sendVerificationData(
          emailString,
          otp,
          ' Forgot Password Email',
        ),
        'Forgot Password Verification OTP Code',
      );

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


    } catch (emailError: any) {
      
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        'Failed to send verification email',
        emailError,
      );
    }

   

    return { status: true, message: 'Checked Your Email' };
  } catch (error: any) {
   

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Password change failed',
      error,
    );
  }
};


const verificationForgotUserIntoDb = async (
  payload: { phoneNumber: string; verificationCode: string }
): Promise<string> => {
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
    const isExistOtp = await users.findOne(
      {
        phoneNumber,
        isVerify: true,
        isDelete: false,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1, email: 1, role: 1 }
    );

    if (!isExistOtp) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found", "");
    }

    // 3️⃣ Generate JWT
    const jwtPayload = {
      id: isExistOtp._id.toString(),
      role: isExistOtp.role,
      email: isExistOtp.email,
    };

    const accessToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string
    );

    // 4️⃣ Cleanup (optional)
    await users.updateOne(
      { _id: isExistOtp._id },
      { $unset: { verificationCode: "" } }
    );

    return accessToken;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "OTP verification failed",
      error
    );
  }
};

const resetPasswordIntoDb = async (payload: {
  userId
: string;
  password: string;
}) => {
  try {
    const isExistUser = await users.findOne(
      {
        $and: [
          { _id: payload.userId,
 },
          { isVerify: true },
          { status: USER_ACCESSIBILITY.isProgress },
        ],
      },
      { _id: 1 },
    );
    if (!isExistUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'some issues by the  reset password section',
        '',
      );
    }
    payload.password = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    );

    const result = await users.findByIdAndUpdate(
      isExistUser._id,
      { password: payload.password },
      { new: true, upsert: true },
    );
    return result && { status: true, message: 'successfully reset password' };
  } catch (error) {
     catchError(error);
  }
};

const googleAuthIntoDb = async (payload: TUser) => {
  try {
   
    let user = await users.findOne(
      {
        email: payload.email,
        isVerify: true
      },
      { _id: 1, role: 1, email: 1, isVerify: 1, },
    );

    let jwtPayload: { id: string; role: string; email: string };

    if (!user) {
     
      payload.isVerify = true;
      
      
      const newUser = new users(payload);
      user = await newUser.save();
    }

    jwtPayload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };
    if (user.isVerify) {
      const accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret as string,
        config.expires_in as string,
      );

      const refreshToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_refresh_secret as string,
        config.refresh_expires_in as string,
      );

      // Update FCM token if provided
      if (payload?.fcm) {
        await users.findByIdAndUpdate(user._id, { $set: { fcm: payload.fcm } },{new:true, upsert:true});
      }

      return { accessToken, refreshToken };
    }

    // If user is not verified
    return { accessToken: null, refreshToken: null };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      error.message || "Google auth failed",
      error,
    );
  }
};


const resendVerificationOtpIntoDb = async (email: string) => {
  try {
    // ✅ 1. Check if the user exists and is not yet verified
    const user = await users.findOne(
      {
        email,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1, isVerify: 1 }
    );

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "This user does not exist in our database.",""
      );
    }

  

    if (user.isVerify) {
      return {
        status:false,
        message:"This user is already verified."
      }
    }


    const otp = await generateUniqueOTP();

    // ✅ 3. Update verification code
    const updatedUser = await users.findByIdAndUpdate(
      user._id,
      { verificationCode: otp },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to update verification code.",""
      );
    }
          await sendEmail(
        email,
        emailcontext.sendVerificationData(
          email,
          otp,
          'User Verification Email',
        ),
        'Verification OTP Code',
      );

    return { status:true ,message:"successfully send email "};
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to resend verification OTP.",
      error
    );
  }
};


const getUserGrowthIntoDb = async (query: { year?: string }) => {
  try {
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();
    const previousYear = year - 1;

    // Get current year stats
    const currentYearStats = await users.aggregate([
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
    const previousYearStats = await users.aggregate([
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

    const currentYearTotal = currentYearStats[0]?.totalCount || 0;
    const previousYearTotal = previousYearStats[0]?.totalCount || 0;

    // Calculate year-over-year growth percentage
    let yearlyGrowth = 0;
    if (previousYearTotal > 0) {
      yearlyGrowth = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
    } else if (currentYearTotal > 0) {
      yearlyGrowth = 100; // If no users in previous year but users exist in current year
    }

    // Extract monthly stats
    const monthlyStats = currentYearStats[0]?.months || [];

    return {
      monthlyStats,
      yearlyGrowth: parseFloat(yearlyGrowth.toFixed(2)),
      year,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch user creation stats",
      error
    );
  }
};

const createAdminAccountIntoDb = async (payload: Partial<TUser>) => {
  try {
    const isExistUser = await users.exists({
      email: payload.email,
      isVerify: true,
    });

    if (isExistUser) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "This user already exists in our system" ,""
      );
    }

    const userData = {
      ...payload,
      isVerify: true,

    };

    await users.create(userData);

    const title = `New Researcher Registration: ${payload.nickname}`;
    const message = `A new researcher user registered with phone number: ${payload.phoneNumber}.`;

    const io = getSocketIO() as any;

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
  } catch (error) {
    catchError(error);
  }
};





const UserServices = {
  createUserIntoDb,
   userVerificationIntoDb ,
   changePasswordIntoDb,
   forgotPasswordIntoDb,
   resetPasswordIntoDb ,
   verificationForgotUserIntoDb,
   googleAuthIntoDb ,
    resendVerificationOtpIntoDb,
     getUserGrowthIntoDb,
     createAdminAccountIntoDb,
     forgotPasswordEmailIntoDb

};
export default UserServices;

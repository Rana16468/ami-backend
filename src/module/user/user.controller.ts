import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import UserServices from './user.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';
import config from '../../app/config';

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.createUserIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Change Onboarding Status',
    data: result,
  });
});

const userVarification: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.userVerificationIntoDb(
    req.body.verificationCode
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Varified Your Account",
    data: result,
  });
});

const chnagePassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.changePasswordIntoDb(req.body, req.user.id);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Change Password",
    data: result,
  });
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
 
  const result = await UserServices.forgotPasswordIntoDb(req.body);

 
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Send Email",
    data: result,
  });
});

const verificationForgotUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.verificationForgotUserIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Verify User",
    data: result,
  });
});

const resetPassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.resetPasswordIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Reset Password",
    data: result,
  });
});

const googleAuth: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.googleAuthIntoDb(req.body);

  const { refreshToken, accessToken } = result;
  res.cookie("refreshToken", refreshToken, {
    secure: config?.NODE_ENV === "production",
    httpOnly: true,
  });
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Login",
    data: {
      accessToken,
    },
  });
});

const resendVerificationOtp:RequestHandler=catchAsync(async(req , res)=>{

     const result=await  UserServices.resendVerificationOtpIntoDb(req.params.email);
      sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Successfully  Resend Verification OTP",
      data: result,
  });
});

const getUserGrowth:RequestHandler=catchAsync(async(req , res)=>{
   const result=await UserServices.getUserGrowthIntoDb(req.query);
        sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Successfully  Find The User Growth",
      data: result,
  });
});


const createAdminAccount:RequestHandler=catchAsync(async(req , res)=>{

    const result=await UserServices.createAdminAccountIntoDb(req.body);
   sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Successfully  Create Admin Account",
      data: result,
  });
    
});

const forgotPasswordEmail:RequestHandler=catchAsync(async(req , res)=>{


    const result=await UserServices.forgotPasswordEmailIntoDb(req.body);
     sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Successfully  Send The Email",
      data: result,
  });

})




const UserController = {
  createUser,
  userVarification,
  chnagePassword,
  forgotPassword,
  verificationForgotUser,
  resetPassword,
  googleAuth,
   resendVerificationOtp,
    getUserGrowth,
    createAdminAccount,
    forgotPasswordEmail

};

export default UserController;
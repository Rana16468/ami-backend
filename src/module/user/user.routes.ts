import express from 'express';
import validationRequest from '../../middleware/validationRequest';
import UserValidationSchema from './user.validation';
import UserController from './user.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from './user.constant';

const router = express.Router();

router.post(
  '/create_user',
  validationRequest(UserValidationSchema.createUserZodSchema),
  UserController.createUser,
);

router.patch(
  "/user_verification",
  validationRequest(UserValidationSchema.UserVerification),
  UserController.userVarification
);
router.patch(
  "/change_password",
  auth(
    USER_ROLE.admin,
    USER_ROLE.superAdmin,
    USER_ROLE.user
  ),
  validationRequest(UserValidationSchema.ChnagePasswordSchema),
  UserController.chnagePassword
);

router.post(
  "/forgot_password",
  validationRequest(UserValidationSchema.ForgotPasswordSchema),
  UserController.forgotPassword
);

router.post(
  "/verification_forgot_user",
  validationRequest(UserValidationSchema.verificationCodeSchema),
  UserController.verificationForgotUser
);

router.post(
  "/reset_password",
  validationRequest(UserValidationSchema.resetPasswordSchema),
  UserController.resetPassword
);

router.post(
  "/google_auth",
  
  validationRequest(UserValidationSchema.createUserZodSchema),
  UserController.googleAuth
);
router.get("/resend_verification_otp/:email",UserController.resendVerificationOtp);
router.get(
  "/user_graph",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
 UserController.getUserGrowth,
);


router.post("/create_admin_account", validationRequest(UserValidationSchema.createUserZodSchema), UserController.createAdminAccount);


router.post("/forgot_password_email", 
  validationRequest(UserValidationSchema.ForgotPasswordEmailSchema),
  UserController.forgotPasswordEmail)



const UserRouters = router;
export default UserRouters;

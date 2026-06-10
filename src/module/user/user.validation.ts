import { string, z } from 'zod';
import { USER_ACCESSIBILITY, USER_ROLE } from './user.constant';

 const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'User name is Required' }).optional(),
   nickname: z.string({required_error:" nickname is Required"}),
    password: z.string({
      required_error: 'Password is Required',
    }).optional(),
    dataCenter: z.string({ required_error: 'dataCenter is not Required' }).optional(),

    email: z
      .string({ required_error: 'Email is Required' })
      .email('Invalid email format').optional(),

    phoneNumber: z
      .string()
      .refine(
        (phone:any) =>
          /^(\+?\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,10}$/.test(phone),
        { message: 'Invalid phone number format' },
      ).optional(),

    gender: z.enum(['male', 'female', 'others'], {
      required_error: 'Gender is required',
    }),

    hobbies: z.array(z.string()).optional().default([]),

    language: z.array(z.string()).optional().default([]),

    age: z.string({ required_error: 'Age is required' }),

    role: z
      .enum(Object.values(USER_ROLE) as [string, ...string[]])
      .default(USER_ROLE.user),

    status: z
      .enum(Object.values(USER_ACCESSIBILITY) as [string, ...string[]])
      .default(USER_ACCESSIBILITY.isProgress),

    photo: z.string().optional(),
    isTramsAndConditions:z.boolean({required_error:"isTramsAndConditions is not required"}).optional(),
    fcm: z.string().optional(),
  }),
});

const UserVerification = z.object({
  body: z.object({
    verificationCode: z
      .number({ required_error: 'varification code is required' })
      .min(6, { message: 'min 6 character accepted' }),
  }),
});

const ChnagePasswordSchema = z.object({
  body: z.object({
    newpassword: z
      .string({ required_error: 'new password is required' })
      .min(6, { message: 'min 6 character accepted' }),
    oldpassword: z
      .string({ required_error: 'old password is  required' })
      .min(6, { message: 'min 6 character accepted' }),
  }),
});

const UpdateUserProfileSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'user name is required' })
      .min(3, { message: 'min 3 character accepted' })
      .max(15, { message: 'max 15 character accepted' })
      .optional(),
       language: z.array(z.string({required_error:"language is not required"})).optional(),
       nickname: z.string({required_error:" nickname is not Required"}).optional(),
    photo: z.string({ required_error: 'optional photot' }).url().optional(),
  }),
});

const ForgotPasswordSchema = z.object({
  body: z.object({
     phoneNumber: z
        .string({required_error:"phone number is required"})
  
  }),
});

const ForgotPasswordEmailSchema = z.object({
  body: z.object({
     email: z
        .string({required_error:"phone number is required"})
  
  }),
});

const verificationCodeSchema = z.object({
  body: z.object({
    phoneNumber:z.string({required_error:"phone number is required"}),
    verificationCode: z
      .number({ required_error: ' verificationCode is require' })
     
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: 'phone number is require' }),
    password: z.string({ required_error: 'password is require' }),
  }),
});

const UserValidationSchema = {
  createUserZodSchema,
  UserVerification,
  ChnagePasswordSchema,
  UpdateUserProfileSchema,
  ForgotPasswordSchema,
  verificationCodeSchema,
  resetPasswordSchema,
  ForgotPasswordEmailSchema
};

export default UserValidationSchema;

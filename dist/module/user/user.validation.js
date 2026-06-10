"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const user_constant_1 = require("./user.constant");
const createUserZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'User name is Required' }).optional(),
        nickname: zod_1.z.string({ required_error: " nickname is Required" }),
        password: zod_1.z.string({
            required_error: 'Password is Required',
        }).optional(),
        dataCenter: zod_1.z.string({ required_error: 'dataCenter is not Required' }).optional(),
        email: zod_1.z
            .string({ required_error: 'Email is Required' })
            .email('Invalid email format').optional(),
        phoneNumber: zod_1.z
            .string()
            .refine((phone) => /^(\+?\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,10}$/.test(phone), { message: 'Invalid phone number format' }).optional(),
        gender: zod_1.z.enum(['male', 'female', 'others'], {
            required_error: 'Gender is required',
        }),
        hobbies: zod_1.z.array(zod_1.z.string()).optional().default([]),
        language: zod_1.z.array(zod_1.z.string()).optional().default([]),
        age: zod_1.z.string({ required_error: 'Age is required' }),
        role: zod_1.z
            .enum(Object.values(user_constant_1.USER_ROLE))
            .default(user_constant_1.USER_ROLE.user),
        status: zod_1.z
            .enum(Object.values(user_constant_1.USER_ACCESSIBILITY))
            .default(user_constant_1.USER_ACCESSIBILITY.isProgress),
        photo: zod_1.z.string().optional(),
        isTramsAndConditions: zod_1.z.boolean({ required_error: "isTramsAndConditions is not required" }).optional(),
        fcm: zod_1.z.string().optional(),
    }),
});
const UserVerification = zod_1.z.object({
    body: zod_1.z.object({
        verificationCode: zod_1.z
            .number({ required_error: 'varification code is required' })
            .min(6, { message: 'min 6 character accepted' }),
    }),
});
const ChnagePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        newpassword: zod_1.z
            .string({ required_error: 'new password is required' })
            .min(6, { message: 'min 6 character accepted' }),
        oldpassword: zod_1.z
            .string({ required_error: 'old password is  required' })
            .min(6, { message: 'min 6 character accepted' }),
    }),
});
const UpdateUserProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z
            .string({ required_error: 'user name is required' })
            .min(3, { message: 'min 3 character accepted' })
            .max(15, { message: 'max 15 character accepted' })
            .optional(),
        language: zod_1.z.array(zod_1.z.string({ required_error: "language is not required" })).optional(),
        nickname: zod_1.z.string({ required_error: " nickname is not Required" }).optional(),
        photo: zod_1.z.string({ required_error: 'optional photot' }).url().optional(),
    }),
});
const ForgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z
            .string({ required_error: "phone number is required" })
    }),
});
const ForgotPasswordEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ required_error: "phone number is required" })
    }),
});
const verificationCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z.string({ required_error: "phone number is required" }),
        verificationCode: zod_1.z
            .number({ required_error: ' verificationCode is require' })
    }),
});
const resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string({ required_error: 'phone number is require' }),
        password: zod_1.z.string({ required_error: 'password is require' }),
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
exports.default = UserValidationSchema;

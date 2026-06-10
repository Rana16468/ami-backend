"use strict";
// import nodemailer from 'nodemailer';
// import config from '../app/config';
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
// const sendEmail = async (to: string, html: string, subject?: string) => {
//   const transporter = nodemailer.createTransport({
//     host: 'smtp-relay.brevo.com',
//     port: 587,
//     secure: config.NODE_ENV?.includes('production'),
//     auth: {
//       user: config.send_email.nodemailer_email,
//       pass: config.send_email.nodemailer_password,
//     },
//   });
//   await transporter.sendMail({
//     from: config.send_email.nodemailer_email,
//     to,
//     subject: subject ? subject : 'User Varification Email',
//     text: 'Varify Email with in 10 mins',
//     html,
//   });
// };
// export default  sendEmail
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../app/config"));
const sendEmail = (to, html, subject) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const transporter = nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com.',
        port: 587,
        secure: (_a = config_1.default.NODE_ENV) === null || _a === void 0 ? void 0 : _a.includes('production'),
        auth: {
            user: config_1.default.send_email.nodemailer_email,
            pass: config_1.default.send_email.nodemailer_password,
        },
    });
    yield transporter.sendMail({
        from: config_1.default.send_email.nodemailer_email,
        to,
        subject: subject ? subject : 'User Varification Email',
        text: 'Varify Email with in 10 mins',
        html,
    });
});
exports.default = sendEmail;
// export default sendEmail;
// import { BrevoClient } from "@getbrevo/brevo";
// export const brevo = new BrevoClient({
//   apiKey: process.env.BREVO_API_KEY!,
// });
// interface SendEmailPayload {
//   to: string;
//   name?: string;
//   subject: string;
//   htmlContent: string;
// }
// export const sendEmail = async (
//   payload: SendEmailPayload
// ) => {
//   try {
//     console.log({BREVO_API_KEY:process.env.BREVO_API_KEY!,BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL, BREVO_SENDER_NAME:process.env.BREVO_SENDER_NAME})
//     const response =
//       await brevo.transactionalEmails.sendTransacEmail({
//         sender: {
//           email: process.env.BREVO_SENDER_EMAIL,
//           name: process.env.BREVO_SENDER_NAME,
//         },
//         to: [
//           {
//             email: payload.to,
//             name: payload.name,
//           },
//         ],
//         subject: payload.subject,
//         htmlContent: payload.htmlContent,
//       });
//     return response;
//   } catch (error) {
//     console.error("Brevo Error:", error);
//     throw error;
//   }
// };

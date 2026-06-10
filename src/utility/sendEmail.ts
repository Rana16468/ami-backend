// import nodemailer from 'nodemailer';
// import config from '../app/config';

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

import nodemailer from 'nodemailer';
import config from '../app/config';



const sendEmail = async (to: string, html: string, subject?: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com.',
    port: 587,
    secure: config.NODE_ENV?.includes('production'),
    auth: {
      user: config.send_email.nodemailer_email,
      pass: config.send_email.nodemailer_password,
    },
  });

  await transporter.sendMail({
    from: config.send_email.nodemailer_email,
    to,
    subject: subject ? subject : 'User Varification Email',
    text: 'Varify Email with in 10 mins',
    html,
  });
};

export default sendEmail;


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


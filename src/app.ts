
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import config from "./app/config";
import cron from 'node-cron'
import cors from "cors";
// import cron from 'node-cron';
import router from "./router";
import notFound from "./middleware/notFound";
import globalErrorHandelar from "./middleware/globalErrorHandelar";
import auto_delete_unverified_user from "./utility/auto_delete_unverified_user";
import catchError from "./app/error/catchError";
import auto_delete_notification from "./utility/auto_delete_notification";
import autoDeleteChatBotInfo from "./utility/autoDeleteChatBotInfo";
// import { setupCors } from "./cors";
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app = express();

// ======= Middlewares =======
app.use(cookieParser());
app.use(cors())

app.use(
  bodyParser.json({
    verify: (req: express.Request, _res, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  config.file_path as string,
  express.static(path.join(__dirname, 'public')),
);






// ======= Test Route =======
app.get("/", (_req, res) => {
  res.send({
    status: true,
    message: "Welcome to rishabhbhard-backend Server is running",
  });
});


cron.schedule("*/5 * * * *", async () => {
  try {
     await auto_delete_unverified_user();
    
  } catch (error: unknown) {
       catchError(error,'[Cron] Error in subscription expiry cron job:');
  }
});
cron.schedule("*/30 * * * *", async () => {
  try {
    await auto_delete_notification();
  } catch (error) {
    catchError(error, "[Cron] Error in notification auto delete cron job:");
  }
});

//autoDeleteChatBotInfo 

// cron.schedule("*/30 * * * *", async () => {
//   try {
   

//    const result= await autoDeleteChatBotInfo();
//    console.log(result);

//   } catch (error) {
//     catchError(error, "[Cron] Error in chatbot auto delete cron job:");
//   }
// });








// ======= API Routes =======
app.use("/api/v1", router);

// ======= 404 & Global Error Handler =======
app.use(notFound);
app.use(globalErrorHandelar);

export default app;

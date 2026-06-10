import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import matchGameServices from "./matchgame.services";
import httpStatus from "http-status";
import sendRespone from "../../utility/sendRespone";



const recordedGameOneData:RequestHandler=catchAsync(async(req , res)=>{


      const result=await  matchGameServices.recordedGameOneDataIntoDB(req.user.id, req.body);
sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Successfully  Recorded",
    data: result
  });

});


const myGameLevel:RequestHandler=catchAsync(async(req , res)=>{
    const result=await matchGameServices.myGameLevelIntoDb(req.user.id);
    sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find My Game Level",
    data: result
  });
});

const deleteMatchGame:RequestHandler=catchAsync(async(req , res)=>{

      const  result=await matchGameServices.deleteMatchGameIntoDb(req.user.id, req.params.id);
    sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully  Delete Match Game",
    data: result
  });

});



const trackingSummary:RequestHandler=catchAsync(async(req , res)=>{


      const result=await matchGameServices.trackingSummaryIntoDb(req.query, req.user.id);
 sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find By  Match Game Summary",
    data: result
  });
      
});


const sendOTP:RequestHandler=catchAsync(async(req , res)=>{


    const result=await matchGameServices.sendOTPIntoDb(req.body.phone);
     sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully Find By  Match Game Summary",
    data: result
  });
})



const matchGameController={
     recordedGameOneData,
     myGameLevel,
      deleteMatchGame,
      trackingSummary,
      sendOTP
};

export default matchGameController;



import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';
import matchGameZodValidation from './matchgame.validations';
import matchGameController from './matchgame.controller';

const route=express.Router();

route.post("/recorded_match_game_data", auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.user), validationRequest(matchGameZodValidation.createMatchGameZodSchema), matchGameController.recordedGameOneData);
route.get("/my_game_level", auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.user), matchGameController.myGameLevel);
route.delete("/delete_match_game/:id", auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.user), matchGameController.deleteMatchGame);
route.get("/tracking_my_match_game_summary", auth(USER_ROLE.user, USER_ROLE.admin),matchGameController.trackingSummary);


 //route.post("/send-otp",matchGameController.sendOTP )


const matchGameRoute= route;

export default matchGameRoute;


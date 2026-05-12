import { Router } from "express";
import * as controller from "./profile.controller.js";

const profileRouter = Router();
profileRouter.get("/", controller.getMe);
profileRouter.patch("/", controller.patchMe);
profileRouter.patch("/password", controller.patchPassword);
profileRouter.get("/activity", controller.getActivity);

const settingsRouter = Router();
settingsRouter.get("/", controller.getSettings);
settingsRouter.patch("/", controller.patchSettings);

export { profileRouter, settingsRouter };

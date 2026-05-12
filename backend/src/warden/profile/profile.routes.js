import { Router } from "express";
import * as controller from "./profile.controller.js";

const router = Router();

router.get("/", controller.getMe);
router.patch("/", controller.updateMe);
router.post("/password", controller.updatePassword);

export default router;

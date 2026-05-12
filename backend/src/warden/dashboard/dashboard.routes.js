import { Router } from "express";
import * as controller from "./dashboard.controller.js";

const router = Router();

router.get("/stats", controller.stats);
router.get("/activity", controller.activity);
router.get("/charts", controller.charts);

export default router;

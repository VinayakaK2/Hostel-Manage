import { Router } from "express";
import * as controller from "./dashboard.controller.js";

const router = Router();

router.get("/stats", controller.getStats);
router.get("/activity", controller.getActivity);
router.get("/charts", controller.getCharts);

export default router;

import { Router } from "express";
import * as controller from "./reports.controller.js";

const router = Router();

router.get("/summary", controller.summary);

export default router;

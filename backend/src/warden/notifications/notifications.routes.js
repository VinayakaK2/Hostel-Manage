import { Router } from "express";
import * as controller from "./notifications.controller.js";

const router = Router();

router.get("/", controller.list);
router.get("/parent-logs", controller.parentLogs);
router.patch("/:id/read", controller.markRead);

export default router;

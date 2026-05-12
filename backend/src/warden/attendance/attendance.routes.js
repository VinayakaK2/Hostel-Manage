import { Router } from "express";
import * as controller from "./attendance.controller.js";

const router = Router();

router.get("/date/:date", controller.byDate);
router.get("/student/:id", controller.byStudent);
router.post("/", controller.submit);

export default router;

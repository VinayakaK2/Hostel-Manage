import { Router } from "express";
import * as controller from "./leave.controller.js";

const router = Router();

router.get("/", controller.list);

export default router;

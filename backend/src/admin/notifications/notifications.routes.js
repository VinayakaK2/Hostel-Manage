import { Router } from "express";
import * as controller from "./notifications.controller.js";

const router = Router();

router.get("/", controller.list);
router.patch("/:id/read", controller.readOne);

export default router;

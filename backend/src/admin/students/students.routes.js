import { Router } from "express";
import * as controller from "./students.controller.js";

const router = Router();

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", controller.update);
router.patch("/:id/room", controller.transferRoom);
router.patch("/:id/status", controller.updateStatus);

export default router;

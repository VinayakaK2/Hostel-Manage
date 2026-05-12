import { Router } from "express";
import * as controller from "./students.controller.js";

const router = Router();

router.get("/rooms", controller.rooms);
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", controller.update);
router.post("/:id/transfer-room", controller.transferRoom);
router.post("/:id/disable", controller.disable);

export default router;

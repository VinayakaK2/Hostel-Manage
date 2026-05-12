import { Router } from "express";
import * as controller from "./wardens.controller.js";

const router = Router();

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", controller.update);
router.patch("/:id/hostel", controller.assignHostel);
router.patch("/:id/status", controller.updateStatus);
router.post("/:id/reset-password", controller.resetPassword);

export default router;

import { Router } from "express";
import * as controller from "./hostels.controller.js";

const router = Router();

router.patch("/rooms/:roomId", controller.patchRoom);

router.get("/", controller.list);
router.post("/", controller.create);

router.get("/:hostelId/occupancy", controller.occupancy);
router.get("/:hostelId/rooms", controller.roomsList);
router.post("/:hostelId/rooms", controller.roomsCreate);

router.get("/:hostelId", controller.getOne);
router.patch("/:hostelId", controller.update);
router.patch("/:hostelId/status", controller.updateStatus);

export default router;

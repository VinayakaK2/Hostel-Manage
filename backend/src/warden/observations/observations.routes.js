import { Router } from "express";
import * as controller from "./observations.controller.js";

const router = Router();

router.get("/", controller.list);
router.post("/", controller.create);
router.patch("/:id", controller.update);

export default router;

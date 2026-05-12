import { Router } from "express";
import * as blueprintController from "../blueprint/blueprint.controller.js";

const router = Router();

router.get("/:id", blueprintController.roomDetail);

export default router;

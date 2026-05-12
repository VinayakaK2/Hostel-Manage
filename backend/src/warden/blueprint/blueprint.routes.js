import { Router } from "express";
import * as controller from "./blueprint.controller.js";

const router = Router();

router.get("/", controller.overview);
router.get("/floor/:floor", controller.floor);

export default router;

import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireWardenHostel } from "./warden.middleware.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import studentsRoutes from "./students/students.routes.js";
import attendanceRoutes from "./attendance/attendance.routes.js";
import observationsRoutes from "./observations/observations.routes.js";
import leaveRoutes from "./leave/leave.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import profileRoutes from "./profile/profile.routes.js";
import blueprintRoutes from "./blueprint/blueprint.routes.js";
import wardenRoomsRoutes from "./rooms/warden-rooms.routes.js";

const router = Router();

router.use(requireAuth, requireWardenHostel);

router.use("/dashboard", dashboardRoutes);
router.use("/students", studentsRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/observations", observationsRoutes);
router.use("/leave-records", leaveRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/profile", profileRoutes);
router.use("/blueprint", blueprintRoutes);
router.use("/rooms", wardenRoomsRoutes);

export default router;

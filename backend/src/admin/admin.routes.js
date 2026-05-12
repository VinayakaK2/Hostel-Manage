import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireAdmin } from "./admin.middleware.js";
import analyticsRoutes from "./analytics/analytics.routes.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import hostelsRoutes from "./hostels/hostels.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import { profileRouter, settingsRouter } from "./profile/profile.routes.js";
import reportsRoutes from "./reports/reports.routes.js";
import studentsRoutes from "./students/students.routes.js";
import wardensRoutes from "./wardens/wardens.routes.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.use("/dashboard", dashboardRoutes);
router.use("/students", studentsRoutes);
router.use("/wardens", wardensRoutes);
router.use("/hostels", hostelsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/reports", reportsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/profile", profileRouter);
router.use("/settings", settingsRouter);

export default router;

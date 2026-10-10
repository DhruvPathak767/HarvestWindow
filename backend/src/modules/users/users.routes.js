import { Router } from "express";
import { usersController } from "./users.controller.js";
import { authenticateUser } from "../../middleware/authenticate.js";
import { authorizeRoles, requireOwnershipOrRole } from "../../middleware/authorize.js";

const router = Router();

// Protected profile routes
router.get("/profile", authenticateUser, usersController.getProfile);
router.patch("/profile", authenticateUser, usersController.updateProfile);

// Role-based authorization demonstrations
router.get("/admin-dashboard", authenticateUser, authorizeRoles("ADMIN"), usersController.adminOnly);
router.get(
  "/farmer-dashboard",
  authenticateUser,
  authorizeRoles("FARMER", "ADMIN"),
  usersController.farmerOnly
);

// Resource ownership protection
router.get(
  "/farms/:ownerId",
  authenticateUser,
  requireOwnershipOrRole((req) => req.params.ownerId, "ADMIN"),
  usersController.getResource
);

export default router;

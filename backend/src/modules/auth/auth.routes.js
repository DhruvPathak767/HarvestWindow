import { Router } from "express";
import { authController } from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validation.js";
import { validate } from "../../middleware/validate.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { authenticateUser } from "../../middleware/authenticate.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticateUser, authController.getMe);

export default router;

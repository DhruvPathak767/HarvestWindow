import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  handleLogin,
  handleRegister,
  handleDemo,
  handleGetMe,
} from "./auth.controller.js";

const router = Router();

router.post("/login", handleLogin);
router.post("/register", handleRegister);
router.post("/demo", handleDemo);
router.get("/me", authenticate, handleGetMe);

export default router;

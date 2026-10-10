import rateLimit from "express-rate-limit";
import { config } from "../config/env.js";

const isTest = config.NODE_ENV === "test";

export const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // limit each IP to 20 auth requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many authentication attempts. Please try again in 15 minutes.",
      },
    });

export const apiLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests. Please slow down.",
      },
    });

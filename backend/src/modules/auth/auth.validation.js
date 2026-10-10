import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Full name is required" })
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(60, "Full name cannot exceed 60 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    role: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          return ["FARMER", "SELLER", "BUYER", "EXPERT"].includes(val.toUpperCase());
        },
        {
          message:
            "Role cannot be ADMIN or invalid during public registration. Permitted roles: FARMER, SELLER.",
        }
      )
      .transform((val) => (val ? val.toUpperCase() : "FARMER")),
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

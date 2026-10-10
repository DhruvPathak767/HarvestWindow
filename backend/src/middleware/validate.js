import { ZodError } from "zod";

export function validate(schema, source = "body") {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = (err.issues || err.errors || []).map((issue) => ({
          field: issue.path.join(".") || "value",
          message: issue.message,
        }));
        // Return 422 for farm entity validation as per Phase 2 tests, 400 for others
        const statusCode = req.baseUrl?.includes("farms") || req.path?.includes("farms") ? 422 : 400;
        return res.status(statusCode).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }
      next(err);
    }
  };
}

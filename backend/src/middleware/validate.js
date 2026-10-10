import { ZodError } from "zod";

/**
 * Higher-order middleware to validate incoming request data using Zod schemas.
 * Supports schemas that validate body, query, or params.
 *
 * @param {import("zod").ZodTypeAny} schema
 * @param {"body" | "params" | "query"} [target="body"]
 */
export function validate(schema, target = "body") {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: formattedErrors,
        });
      }
      next(error);
    }
  };
}

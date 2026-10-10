import { getSettings, updateSettings } from "./settings.service.js";
import { patchSettingsSchema } from "./settings.validation.js";

export class SettingsController {
  async getSettings(req, res, next) {
    try {
      const data = await getSettings(req.user.id);
      res.status(200).json({
        success: true,
        message: "User settings retrieved successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const parsed = patchSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message || "Invalid settings payload.";
        return res.status(422).json({
          success: false,
          message: firstError,
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = await updateSettings(req.user.id, parsed.data);
      res.status(200).json({
        success: true,
        message: "Settings updated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();

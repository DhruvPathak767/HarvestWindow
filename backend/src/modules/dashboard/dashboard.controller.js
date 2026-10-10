import { getDashboardData } from "./dashboard.service.js";

export class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const data = await getDashboardData(req.user.id);
      res.status(200).json({
        success: true,
        message: "Dashboard analytics retrieved successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();

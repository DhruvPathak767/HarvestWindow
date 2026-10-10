import { usersService } from "./users.service.js";

export class UsersController {
  async getProfile(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: { user: req.user },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await usersService.updateProfile(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async adminOnly(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: "Admin authorization verified. Access granted to administrative control plane.",
        data: {
          adminUser: req.user.email,
          systemStatus: "healthy",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async farmerOnly(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: "Farmer authorization verified. Access granted to farmer workspace.",
        data: {
          farmer: req.user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getResource(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: "Resource ownership verified.",
        data: {
          resourceOwner: req.params.ownerId,
          requestedBy: req.user.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();

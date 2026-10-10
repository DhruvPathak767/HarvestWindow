import { prisma } from "../../config/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
};

export class UsersService {
  async updateProfile(userId, updateData) {
    // Strictly prevent role escalation through profile update
    const allowedData = {};
    const nameVal = updateData.name || updateData.fullName;
    if (nameVal && typeof nameVal === "string") {
      allowedData.name = nameVal.trim();
    }

    if (Object.keys(allowedData).length === 0) {
      throw new AppError("No valid profile fields provided for update.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: allowedData,
      select: SAFE_USER_SELECT,
    });

    return updated;
  }

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return user;
  }
}

export const usersService = new UsersService();

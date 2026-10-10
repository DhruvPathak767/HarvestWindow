import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";
import { generateToken } from "../../middleware/authenticate.js";

const DEMO_EMAIL = "ananya@harvestwindow.demo";
const DEMO_PASSWORD = "harvest-demo";

/**
 * Ensures the demo user exists in the database.
 */
async function ensureDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!user) {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        id: "demo-user-ananya",
        email: DEMO_EMAIL,
        passwordHash: hash,
        fullName: "Ananya Deshpande",
        role: "Farm manager",
        organisation: "Greenridge Producer Group",
      },
    });
  }

  return user;
}

/**
 * Authenticates user credentials or handles demo fallback.
 */
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // Handle demo account
  if (normalizedEmail === DEMO_EMAIL) {
    if (password !== DEMO_PASSWORD) {
      throw new Error("Invalid password for demo account");
    }
    const demoUser = await ensureDemoUser();
    const token = generateToken(demoUser);
    return {
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        fullName: demoUser.fullName,
        role: demoUser.role,
        organisation: demoUser.organisation,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organisation: user.organisation,
    },
  };
}

/**
 * Registers a new user account.
 */
export async function registerUser({ email, password, fullName }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new Error("An account with this email address already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName: fullName.trim(),
      role: "Farm manager",
      organisation: "Independent",
    },
  });

  const token = generateToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organisation: user.organisation,
    },
  };
}

/**
 * Generates an instant demo session token.
 */
export async function startDemoSession() {
  const demoUser = await ensureDemoUser();
  const token = generateToken(demoUser);
  return {
    token,
    user: {
      id: demoUser.id,
      email: demoUser.email,
      fullName: demoUser.fullName,
      role: demoUser.role,
      organisation: demoUser.organisation,
    },
  };
}

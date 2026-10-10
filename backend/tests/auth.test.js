import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { config } from "../src/config/env.js";

describe("HarvestWindow Complete Authentication & RBAC Test Suite", () => {
  const uniqueSuffix = Date.now().toString(36);
  const testUser = {
    name: "Farmer Ananya",
    email: `ananya_${uniqueSuffix}@farm.example`,
    password: "StrongPassword123!",
  };

  const adminUser = {
    name: "Admin Officer",
    email: `admin_${uniqueSuffix}@farm.example`,
    password: "AdminPassword123!",
  };

  let farmerAccessToken = "";
  let farmerRefreshTokenCookie = "";
  let farmerId = "";
  let adminAccessToken = "";
  let adminId = "";

  before(async () => {
    // Ensure test database connection
    await prisma.$connect();
  });

  after(async () => {
    // Cleanup created test records
    await prisma.refreshSession.deleteMany({
      where: {
        user: {
          email: { in: [testUser.email, adminUser.email, `inactive_${uniqueSuffix}@farm.example`] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [testUser.email, adminUser.email, `inactive_${uniqueSuffix}@farm.example`] },
      },
    });
    await prisma.$disconnect();
  });

  // 1. Successful registration
  test("1. Successful user registration assigns FARMER role and safe fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user.id);
    assert.equal(res.body.data.user.name, testUser.name);
    assert.equal(res.body.data.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.data.user.role, "FARMER");
    assert.equal(res.body.data.user.isActive, true);
    // Ensure passwordHash is never returned
    assert.equal(res.body.data.user.passwordHash, undefined);
    farmerId = res.body.data.user.id;
  });

  // 2. Duplicate-email registration
  test("2. Duplicate-email registration returns 409 conflict", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Duplicate User",
        email: testUser.email,
        password: "AnotherPassword123!",
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes("already exists"));
  });

  // 3. Invalid registration inputs
  test("3. Registration with invalid email or weak password returns 400 validation error", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "X",
        email: "not-an-email",
        password: "short",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.some((e) => e.field === "email"));
    assert.ok(res.body.errors.some((e) => e.field === "password"));
  });

  // 15. Attempts to assign ADMIN during public registration
  test("15. Attempts to assign ADMIN role during public registration are rejected", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Hacker User",
        email: `hacker_${uniqueSuffix}@farm.example`,
        password: "HackerPassword123!",
        role: "ADMIN",
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === "role"));
  });

  // 4. Successful login
  test("4. Successful login returns access token, user profile, and HttpOnly refresh cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.data.user.passwordHash, undefined);

    farmerAccessToken = res.body.data.accessToken;

    const cookies = res.headers["set-cookie"];
    assert.ok(cookies && cookies.length > 0);
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(refreshCookie);
    assert.ok(refreshCookie.includes("HttpOnly"));
    farmerRefreshTokenCookie = refreshCookie.split(";")[0];
  });

  // 5. Incorrect password
  test("5. Login with incorrect password returns generic 401 error", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword999!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Invalid email or password.");
  });

  // 6. Nonexistent email login
  test("6. Login with nonexistent email returns identical generic 401 error", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `nonexistent_${uniqueSuffix}@nowhere.example`,
        password: "SomePassword123!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Invalid email or password.");
  });

  // 7. Inactive-account login
  test("7. Inactive user cannot log in and receives 403 Forbidden", async () => {
    const inactivePasswordHash = await argon2.hash("InactivePassword123!", {
      type: argon2.argon2id,
    });
    await prisma.user.create({
      data: {
        name: "Deactivated Farmer",
        email: `inactive_${uniqueSuffix}@farm.example`,
        passwordHash: inactivePasswordHash,
        role: "FARMER",
        isActive: false,
      },
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: `inactive_${uniqueSuffix}@farm.example`,
        password: "InactivePassword123!",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes("deactivated"));
  });

  // 8. Access to /auth/me without authentication
  test("8. Access to /api/v1/auth/me without authentication token returns 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 9. Access to /auth/me with valid authentication
  test("9. Access to /api/v1/auth/me with valid Bearer token returns safe user", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${farmerAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testUser.email.toLowerCase());
    assert.equal(res.body.data.user.role, "FARMER");
    assert.equal(res.body.data.user.passwordHash, undefined);
  });

  // 10. Expired or invalid access tokens
  test("10. Corrupted or expired access token returns 401", async () => {
    const fakeToken = jwt.sign(
      { sub: farmerId, role: "FARMER" },
      "wrong_secret_that_should_fail_signature_validation_12345",
      { expiresIn: "10s", issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE }
    );

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${fakeToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 11. Refresh-token rotation
  let rotatedRefreshTokenCookie = "";
  test("11. Refresh endpoint rotates token, revokes previous session, and issues new tokens", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", farmerRefreshTokenCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.notEqual(res.body.data.accessToken, farmerAccessToken);

    const cookies = res.headers["set-cookie"];
    assert.ok(cookies && cookies.length > 0);
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(refreshCookie);
    rotatedRefreshTokenCookie = refreshCookie.split(";")[0];
    assert.notEqual(rotatedRefreshTokenCookie, farmerRefreshTokenCookie);
  });

  // 12. Refresh-token reuse or revocation
  test("12. Reuse of previous rotated refresh token triggers breach detection and revokes sessions", async () => {
    // Attempting to use the OLD cookie which was rotated
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", farmerRefreshTokenCookie);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes("reuse detected"));
  });

  // 14. Rejected access to role-restricted endpoints
  test("14. FARMER cannot access ADMIN-only endpoint (returns 403)", async () => {
    // Register & login admin
    const adminPasswordHash = await argon2.hash(adminUser.password, { type: argon2.argon2id });
    const admin = await prisma.user.create({
      data: {
        name: adminUser.name,
        email: adminUser.email.toLowerCase(),
        passwordHash: adminPasswordHash,
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: adminUser.email,
      password: adminUser.password,
    });
    adminAccessToken = adminLogin.body.data.accessToken;

    // Farmer accessing Admin route
    const farmerTryAdmin = await request(app)
      .get("/api/v1/users/admin-dashboard")
      .set("Authorization", `Bearer ${farmerAccessToken}`);

    assert.equal(farmerTryAdmin.status, 403);
    assert.equal(farmerTryAdmin.body.success, false);
    assert.ok(farmerTryAdmin.body.message.includes("Forbidden"));

    // Admin accessing Admin route
    const adminOk = await request(app)
      .get("/api/v1/users/admin-dashboard")
      .set("Authorization", `Bearer ${adminAccessToken}`);

    assert.equal(adminOk.status, 200);
    assert.equal(adminOk.body.success, true);
  });

  // 16. Attempts to access another user's resources
  test("16. Resource ownership check prevents accessing another user's resources", async () => {
    // Farmer trying to access resources owned by Admin
    const res = await request(app)
      .get(`/api/v1/users/farms/${adminId}`)
      .set("Authorization", `Bearer ${farmerAccessToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);

    // Farmer accessing their own resource
    const selfRes = await request(app)
      .get(`/api/v1/users/farms/${farmerId}`)
      .set("Authorization", `Bearer ${farmerAccessToken}`);

    assert.equal(selfRes.status, 200);
    assert.equal(selfRes.body.success, true);
  });

  // 17. Password hashes never appear in API responses
  test("17. Verify password hashes never appear in any API responses", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    const bodyStr = JSON.stringify(res.body);
    assert.equal(bodyStr.includes("passwordHash"), false);
    assert.equal(bodyStr.includes("$argon2id$"), false);
  });

  // 13. Successful logout
  test("13. Successful logout revokes refresh session and clears cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", rotatedRefreshTokenCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const cookies = res.headers["set-cookie"];
    assert.ok(cookies);
    const clearCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(clearCookie);
    // Expired or cleared in the past
    assert.ok(clearCookie.includes("Expires=Thu, 01 Jan 1970"));
  });

  // 18. Cookie and CORS headers verification
  test("18. Strict CORS headers and security headers are enforced", async () => {
    const res = await request(app)
      .get("/api/v1/health")
      .set("Origin", "http://localhost:5173");

    assert.equal(res.status, 200);
    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
    assert.equal(res.headers["access-control-allow-credentials"], "true");
    assert.ok(res.headers["x-content-type-options"]); // Helmet header
  });
});

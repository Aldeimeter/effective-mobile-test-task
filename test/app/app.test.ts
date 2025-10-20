import request from "supertest";
import app from "../../src/app.js";

describe("Test health endpoint", () => {
  it("should return 200 status with health check", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "Server is running",
    });
  });

  it("should return 404 for unknown routes", async () => {
    const response = await request(app).get("/unknown-route");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        message: "Route not found",
      },
    });
  });
});

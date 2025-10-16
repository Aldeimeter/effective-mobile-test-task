import request from "supertest";
import app from "../../src/app.js";

describe('Test "/" to verify jest and supertest works', () => {
  it("should return 200 status and hello world message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "hello world" });
  });
});

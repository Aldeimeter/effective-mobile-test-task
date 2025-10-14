import express from "express";

const app = express();

app.get("/", (req, res) => {
  return res.json({ message: "hello world" });
});

export default app;

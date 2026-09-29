// server/index.js
// Main entry point for Boconic Full-stack Application

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public folders
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "../client/public")));

// API Endpoints
app.use("/api", apiRouter);

// Serve built frontend if exists
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  // Try sending client/dist/index.html if built
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.json({
        name: "Boconic API Gateway",
        status: "RUNNING",
        mascot: "🥑 Quả Bơ - Book Connect Mascot",
        version: "1.0.0",
        message: "Máy chủ Boconic đang hoạt động. Khởi động frontend tại http://localhost:5173 hoặc chạy 'npm run build' để đóng gói.",
        endpoints: {
          metrics: "/api/metrics",
          books: "/api/books",
          requests: "/api/requests",
          loans: "/api/loans",
          materials: "/api/materials",
          fairScheduling: "/api/coordinator/fair-schedule",
          shortageForecast: "/api/coordinator/forecast",
          aiSimulation: "/api/ai/simulation",
          riskQueue: "/api/coordinator/risk-queue"
        }
      });
    }
  });
});

// Start listening
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🥑 BOCONIC BACKEND ĐANG CHẠY TẠI http://localhost:${PORT}`);
    console.log(`🥑 Môi trường: Sẵn sàng kết nối sách và học liệu mở`);
    console.log(`======================================================\n`);
  });
}

export default app;

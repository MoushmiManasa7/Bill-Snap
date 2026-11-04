import "dotenv/config";
import cors from "cors";
import express from "express";
import { analyzeBill, isGeminiConfigured } from "./analyze";
import { analyzeRequestSchema } from "./schema";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        error:
          "AI is not configured. Add GEMINI_API_KEY to backend/.env and restart the server.",
        code: "AI_UNAVAILABLE",
      });
      return;
    }

    const parsed = analyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid analyze request. Send a bill image and optional OCR text.",
        code: "INVALID_REQUEST",
      });
      return;
    }

    console.log("Analyze request received");
    const extraction = await analyzeBill(parsed.data);
    console.log("Analyze request completed");
    res.json(extraction);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    const name = err instanceof Error ? err.name : "Error";
    const status = name === "ConfigError" ? 503 : name === "ParseError" ? 502 : 500;
    console.error("analyze failed:", err);
    res.status(status).json({
      error: message,
      code: name === "ParseError" ? "INVALID_JSON" : "ANALYZE_FAILED",
    });
  }
});

app.listen(port, () => {
  console.log(`Bill Snap API listening on http://localhost:${port}`);
  console.log(
    isGeminiConfigured()
      ? "Gemini API key detected."
      : "GEMINI_API_KEY is missing. Bill detection will be unavailable.",
  );
});

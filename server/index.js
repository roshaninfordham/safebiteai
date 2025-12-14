// SafeBite API Gateway - exposes /api/agent/run and /api/agent/stream (SSE)
// Phase 2 implementation: local Node/Express server with agent runner and SSE timeline.

import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { startAgentRun, subscribe, getSession } from "./agentRunner.js";

const app = express();
const port = process.env.PORT || 8000;
const allowOrigins = (process.env.ALLOW_ORIGINS || "*").split(",");
const corsOrigin = allowOrigins.length === 1 && allowOrigins[0] === "*" ? true : allowOrigins;

app.use(cors({ origin: corsOrigin, methods: ["GET", "POST"], credentials: false }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "safebite-api", time: new Date().toISOString() });
});

app.post("/api/agent/run", async (req, res) => {
  const session_id = randomUUID();
  const payload = req.body || {};
  // Kick off agent run asynchronously
  startAgentRun(session_id, payload).catch((e) => console.error("agent run error", e));
  res.json({ session_id });
});

app.get("/api/agent/stream", (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    res.status(400).json({ error: "session_id required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const session = getSession(sessionId);
  if (!session) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: "session not found" })}\n\n`);
    res.end();
    return;
  }

  // Send historical events first
  session.events.forEach((evt) => {
    res.write(`event: step\ndata: ${JSON.stringify(evt)}\n\n`);
  });
  if (session.final) {
    res.write(`event: final\ndata: ${JSON.stringify(session.final)}\n\n`);
    res.end();
    return;
  }

  const send = (evt) => {
    if (evt.type === "final") {
      res.write(`event: final\ndata: ${JSON.stringify(evt.data)}\n\n`);
      res.end();
    } else {
      res.write(`event: step\ndata: ${JSON.stringify(evt)}\n\n`);
    }
  };

  const unsubscribe = subscribe(sessionId, send);
  req.on("close", () => {
    unsubscribe();
  });
});

app.listen(port, () => {
  console.log(`SafeBite API listening on http://localhost:${port}`);
});

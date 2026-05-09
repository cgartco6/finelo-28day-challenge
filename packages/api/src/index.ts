import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { ChallengeEngine } from "@finelo/challenge";
import { SimulatorEngine } from "@finelo/simulator";
import { AutoTraderEngine } from "@finelo/autotrader";
import { ApprovalWorkflow } from "@finelo/approval";

const app = express();
app.use(cors());
app.use(express.json());

const challenge = new ChallengeEngine();
const simulator = new SimulatorEngine();
const autotrader = new AutoTraderEngine();
const approval = new ApprovalWorkflow();

app.get("/api/challenge/today/:userId", async (req, res) => {
  const lesson = await challenge.getTodaysLesson(req.params.userId);
  res.json(lesson);
});

app.post("/api/simulator/order", async (req, res) => {
  const result = await simulator.executeOrder(req.body);
  res.json(result);
});

app.post("/api/autotrader/request", async (req, res) => {
  const requests = await autotrader.evaluateAndRequest(req.body.userId);
  res.json(requests);
});

app.post("/api/autotrader/approve/:requestId", async (req, res) => {
  await approval.approve(req.params.requestId, true);
  res.json({ success: true });
});

const server = app.listen(4000, () => console.log("API running on port 4000"));

const wss = new WebSocketServer({ server });
wss.on("connection", ws => {
  ws.on("message", msg => console.log("ws message", msg.toString()));
});

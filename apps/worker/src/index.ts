import { createServer } from "node:http";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required");

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const worker = new Worker(
  "system",
  async (job) => {
    if (job.name !== "ping") throw new Error("Unsupported system job");
    return { ok: true };
  },
  { connection }
);

worker.on("error", (error) => {
  process.stderr.write(JSON.stringify({ event: "worker_error", message: error.message }) + "\n");
});

const server = createServer(async (request, response) => {
  if (request.url !== "/health") {
    response.writeHead(404).end();
    return;
  }
  try {
    await connection.ping();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ready", service: "worker" }));
  } catch {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "not_ready" }));
  }
});
server.listen(3001, "0.0.0.0");

async function shutdown() {
  server.close();
  await worker.close();
  connection.disconnect();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

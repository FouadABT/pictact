import express from "express";
import {
  InitResponse,
} from "../shared/types/api";
import {
  createServer,
  context,
  reddit,
} from "@devvit/web/server";

const app = express();
app.use(express.json());

const router = express.Router();

router.get("/api/init", async (_req, res): Promise<void> => {
  const { postId } = context;

  if (!postId) {
    console.error("API Init Error: postId not found in devvit context");
    res.status(400).json({
      status: "error",
      message: "postId is required but missing from context",
    });
    return;
  }

  try {
    const username = await reddit.getCurrentUsername();

    const response: InitResponse = {
      type: "init",
      postId: postId,
      username: username || "Anonymous",
    };

    res.json(response);
    console.log("API Init Success:", response);
  } catch (error) {
    console.error("API Init Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to initialize app",
    });
  }
});

app.use(router);

const server = createServer(app);
export default server;
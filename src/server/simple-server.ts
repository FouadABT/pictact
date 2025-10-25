import express from "express";
import { createServer } from "@devvit/web/server";

const app = express();
app.use(express.json());

const router = express.Router();

// Simple init endpoint that works
router.get("/api/init", async (req, res): Promise<void> => {
  try {
    // Get basic context from request
    let postId = "pictact_post";
    let username = "PicTactUser";
    
    try {
      // Access context from the request object in Devvit
      const ctx = (req as any).context;
      if (ctx) {
        if (ctx.postId) {
          postId = ctx.postId;
        }
        if (ctx.userId) {
          username = `User_${ctx.userId.slice(-6)}`;
        }
      }
    } catch (e) {
      console.log("Using fallback context:", e);
    }

    res.json({
      type: "init",
      postId: postId,
      username: username,
    });
  } catch (error) {
    console.error("Init error:", error);
    res.json({
      type: "init", 
      postId: "fallback",
      username: "Anonymous",
    });
  }
});

// Simple event creation endpoint
router.post("/api/reddit/posts", async (req, res): Promise<void> => {
  try {
    console.log("Received post creation request");
    console.log("Request body:", JSON.stringify(req.body));
    
    const { gameConfig } = req.body;
    
    if (!gameConfig) {
      console.error("Missing gameConfig in request");
      res.status(400).json({
        success: false,
        message: "Game configuration is required"
      });
      return;
    }

    console.log("Creating event with title:", gameConfig.title);

    // Get context if available
    let contextInfo = {};
    try {
      const ctx = (req as any).context;
      if (ctx) {
        contextInfo = {
          subreddit: ctx.subredditName || 'unknown',
          userId: ctx.userId || 'unknown'
        };
        console.log("Context info:", contextInfo);
      }
    } catch (e) {
      console.log("No context available:", e);
    }

    // Simple success response
    const response = {
      success: true,
      data: {
        postId: `post_${Date.now()}`,
        gameId: `game_${Date.now()}`,
        title: gameConfig.title,
        description: gameConfig.description || '',
        status: "created",
        createdAt: new Date().toISOString(),
        ...contextInfo
      }
    };

    console.log("Sending success response:", JSON.stringify(response));
    res.json(response);

  } catch (error) {
    console.error("Create event error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create event",
      error: String(error)
    });
  }
});

// Simple endpoints for other features
router.get("/api/games/live", async (_req, res): Promise<void> => {
  res.json([]);
});

router.get("/api/events/upcoming", async (_req, res): Promise<void> => {
  res.json([]);
});

router.get("/api/leaderboard", async (_req, res): Promise<void> => {
  res.json([]);
});

app.use(router);

const server = createServer(app);
export default server;
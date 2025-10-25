import { createServer } from "@devvit/web/server";

// Create the Devvit server with minimal dependencies
export default createServer((app) => {
  // Enable JSON parsing middleware
  app.use((req, _res, next) => {
    if (req.headers['content-type']?.includes('application/json')) {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          (req as any).body = JSON.parse(body);
        } catch (e) {
          (req as any).body = {};
        }
        next();
      });
    } else {
      next();
    }
  });

  // Init endpoint
  app.get("/api/init", (_req, res) => {
    try {
      res.json({
        type: "init",
        postId: "pictact_post",
        username: "PicTactUser",
      });
    } catch (error) {
      res.status(500).send("Init failed");
    }
  });

  // Create event endpoint
  app.post("/api/reddit/posts", (req, res) => {
    try {
      const body = (req as any).body || {};
      const { gameConfig } = body;
      
      if (!gameConfig) {
        res.status(400).json({
          success: false,
          message: "Game configuration is required"
        });
        return;
      }

      res.json({
        success: true,
        data: {
          postId: `post_${Date.now()}`,
          gameId: `game_${Date.now()}`,
          title: gameConfig.title || 'Untitled Event',
          description: gameConfig.description || '',
          status: "created",
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).send("Create event failed");
    }
  });

  // Other endpoints
  app.get("/api/games/live", (_req, res) => {
    res.json([]);
  });

  app.get("/api/events/upcoming", (_req, res) => {
    res.json([]);
  });

  app.get("/api/leaderboard", (_req, res) => {
    res.json([]);
  });
});

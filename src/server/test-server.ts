import { createServer } from "@devvit/web/server";

export default createServer((app) => {
  app.get("/api/init", (_req, res) => {
    res.json({ type: "init", postId: "test", username: "TestUser" });
  });

  app.post("/api/reddit/posts", (_req, res) => {
    res.json({ success: true, data: { postId: "test123", gameId: "game123" } });
  });

  app.get("/api/games/live", (_req, res) => res.json([]));
  app.get("/api/events/upcoming", (_req, res) => res.json([]));
  app.get("/api/leaderboard", (_req, res) => res.json([]));
});

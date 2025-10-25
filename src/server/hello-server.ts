import { createServer } from "@devvit/web/server";

export default createServer((app) => {
  app.get("/hello", (_req, res) => {
    res.json({ message: "Hello from PicTact server!" });
  });
});

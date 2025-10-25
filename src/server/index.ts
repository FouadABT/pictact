import express from "express";
import {
  InitResponse,
  AuthStatusResponse,
  LogoutResponse,
} from "../shared/types/api";

import {
  createServer,
} from "@devvit/web/server";
import { AuthenticationService } from "./core/auth";
import { DataExportService, ExportOptions, ExportFormat } from "./core/data-export-service-simple.js";
import { RedditComplianceService } from "./core/reddit-compliance-service";
import { RedditPostCommentService } from "./core/reddit-post-comment-service";
import { RedditRealTimeService } from "./core/reddit-realtime-service";

const app = express();
app.use(express.json());

const router = express.Router();
const redditComplianceService = new RedditComplianceService();
const redditPostCommentService = new RedditPostCommentService();
const redditRealTimeService = new RedditRealTimeService();
const authService = new AuthenticationService();
const dataExportService = new DataExportService();

router.get("/api/init", async (_req, res): Promise<void> => {
  try {
    // Always return a successful response with fallback values
    const response: InitResponse = {
      type: "init",
      postId: "pictact_post",
      username: "PicTactUser",
    };

    res.json(response);
    console.log("API Init Success:", response);
  } catch (error) {
    console.error("API Init Error:", error);
    // Always return a valid response, even if there are errors
    res.json({
      type: "init",
      postId: "fallback",
      username: "Anonymous",
    });
  }
});

// Authentication endpoints
router.get("/api/auth/status", async (req, res): Promise<void> => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.query.sessionToken as string;
    
    if (sessionToken) {
      // Validate existing session
      const validation = await authService.validateSession(sessionToken);
      
      if (validation.isValid && validation.user) {
        const response: AuthStatusResponse = {
          type: "auth_status",
          isAuthenticated: true,
          user: {
            username: validation.user.redditUsername,
            userId: validation.user.redditUserId,
            isAnonymous: validation.user.isAnonymous,
            permissions: validation.user.permissions
          },
          sessionToken: validation.user.sessionToken
        };
        res.json(response);
        return;
      }
    }

    // Get current user authentication
    const authResult = await authService.getCurrentUser();
    
    if (authResult.success && authResult.user) {
      const response: AuthStatusResponse = {
        type: "auth_status",
        isAuthenticated: !authResult.user.isAnonymous,
        user: {
          username: authResult.user.redditUsername,
          userId: authResult.user.redditUserId,
          isAnonymous: authResult.user.isAnonymous,
          permissions: authResult.user.permissions
        },
        sessionToken: authResult.user.sessionToken
      };
      res.json(response);
    } else {
      const response: AuthStatusResponse = {
        type: "auth_status",
        isAuthenticated: false
      };
      res.json(response);
    }
  } catch (error) {
    console.error("Auth status error:", error);
    res.status(500).json({
      type: "auth_status",
      isAuthenticated: false,
      error: "Failed to check authentication status"
    });
  }
});

router.post("/api/auth/logout", async (req, res): Promise<void> => {
  try {
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      res.status(400).json({
        type: "logout",
        success: false,
        message: "Session token is required"
      });
      return;
    }

    await authService.logout(sessionToken);
    
    const response: LogoutResponse = {
      type: "logout",
      success: true,
      message: "Successfully logged out"
    };
    
    res.json(response);
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      type: "logout",
      success: false,
      message: "Failed to logout"
    });
  }
});

// Reddit post and comment management endpoints
router.post("/api/reddit/posts", async (req, res): Promise<void> => {
  try {
    const { gameConfig } = req.body;
    
    if (!gameConfig) {
      res.status(400).json({
        success: false,
        message: "Game configuration is required"
      });
      return;
    }

    console.log("Creating game post with config:", gameConfig);

    // For now, simulate successful creation until Reddit integration is fully working
    const mockResult = {
      success: true,
      data: {
        postId: `post_${Date.now()}`,
        gameId: `game_${Date.now()}`,
        title: gameConfig.title,
        status: "created",
        createdAt: new Date().toISOString()
      }
    };

    res.json(mockResult);
    console.log("Game post created successfully:", mockResult);

  } catch (error) {
    console.error("Create game post error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create game post"
    });
  }
});

router.post("/api/reddit/comments", async (req, res): Promise<void> => {
  try {
    const { commentConfig } = req.body;
    
    if (!commentConfig) {
      res.status(400).json({
        success: false,
        message: "Comment configuration is required"
      });
      return;
    }

    const result = await redditPostCommentService.submitGameComment(commentConfig);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error,
        rateLimited: result.rateLimited,
        retryAfter: result.retryAfter
      });
    }
  } catch (error) {
    console.error("Submit game comment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit game comment"
    });
  }
});

router.post("/api/reddit/game-thread", async (req, res): Promise<void> => {
  try {
    const { postId, gameId } = req.body;
    
    if (!postId || !gameId) {
      res.status(400).json({
        success: false,
        message: "Post ID and Game ID are required"
      });
      return;
    }

    const result = await redditPostCommentService.createGameThread(postId, gameId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error("Create game thread error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create game thread"
    });
  }
});

router.post("/api/reddit/round-update", async (req, res): Promise<void> => {
  try {
    const { gameThread, roundUpdate } = req.body;
    
    if (!gameThread || !roundUpdate) {
      res.status(400).json({
        success: false,
        message: "Game thread and round update data are required"
      });
      return;
    }

    const result = await redditPostCommentService.postRoundUpdate(gameThread, roundUpdate);
    
    if (result.success) {
      res.json({
        success: true,
        data: { commentId: result.data }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error("Post round update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to post round update"
    });
  }
});

router.post("/api/reddit/leaderboard-update", async (req, res): Promise<void> => {
  try {
    const { gameThread, leaderboard } = req.body;
    
    if (!gameThread || !leaderboard) {
      res.status(400).json({
        success: false,
        message: "Game thread and leaderboard data are required"
      });
      return;
    }

    const result = await redditPostCommentService.postLeaderboardUpdate(gameThread, leaderboard);
    
    if (result.success) {
      res.json({
        success: true,
        data: { commentId: result.data }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error("Post leaderboard update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to post leaderboard update"
    });
  }
});

router.post("/api/reddit/player-submission", async (req, res): Promise<void> => {
  try {
    const { gameThread, playerId, submissionUrl, roundNumber } = req.body;
    
    if (!gameThread || !playerId || !submissionUrl || !roundNumber) {
      res.status(400).json({
        success: false,
        message: "Game thread, player ID, submission URL, and round number are required"
      });
      return;
    }

    const result = await redditPostCommentService.handlePlayerSubmission(
      gameThread, 
      playerId, 
      submissionUrl, 
      roundNumber
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: { commentId: result.data }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error("Handle player submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to handle player submission"
    });
  }
});

// Reddit Real-Time Update endpoints
router.get("/api/games/:gameId/updates", async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 60000); // Default to last minute
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        message: "Game ID is required"
      });
      return;
    }

    // For now, return empty updates array as this would be populated by the polling system
    // In a real implementation, this would fetch updates from the Reddit comment polling system
    res.json({
      success: true,
      updates: [],
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error("Get game updates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get game updates"
    });
  }
});

router.get("/api/games/:gameId/timer-sync", async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        message: "Game ID is required"
      });
      return;
    }

    // Mock game thread for timer synchronization
    const mockGameThread = {
      postId: gameId,
      gameCommentId: `game_${gameId}`,
      rulesCommentId: `rules_${gameId}`,
      statusCommentId: `status_${gameId}`,
      roundCommentIds: [],
      submissionCommentIds: [],
      lastUpdateTime: new Date()
    };

    const result = await redditRealTimeService.synchronizeClientTimer(mockGameThread);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error("Timer sync error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to synchronize timer"
    });
  }
});

router.post("/api/games/:gameId/start-polling", async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { gameThread } = req.body;
    
    if (!gameId || !gameThread) {
      res.status(400).json({
        success: false,
        message: "Game ID and game thread are required"
      });
      return;
    }

    // Initialize polling for the game
    const result = await redditRealTimeService.initializeGamePolling(gameThread, (update) => {
      // In a real implementation, this would broadcast updates to connected clients
      console.log(`Game ${gameId} update:`, update);
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: "Polling initialized successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error("Start polling error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start polling"
    });
  }
});

router.post("/api/games/:gameId/stop-polling", async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        message: "Game ID is required"
      });
      return;
    }

    // Stop polling for the game
    redditRealTimeService.stopPolling(`game_${gameId}`);
    
    res.json({
      success: true,
      message: "Polling stopped successfully"
    });

  } catch (error) {
    console.error("Stop polling error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop polling"
    });
  }
});

router.get("/api/games/:gameId/polling-status", async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    
    if (!gameId) {
      res.status(400).json({
        success: false,
        message: "Game ID is required"
      });
      return;
    }

    const status = redditRealTimeService.getPollingStatus(`game_${gameId}`);
    
    res.json({
      success: true,
      status: status || { isActive: false, message: "No polling active for this game" }
    });

  } catch (error) {
    console.error("Get polling status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get polling status"
    });
  }
});

// Data export endpoints - Reddit Devvit compliant
router.post("/api/profile/export", async (req, res): Promise<void> => {
  try {
    // Verify Devvit context through Reddit Compliance Service
    const contextResult = await redditComplianceService.getDevvitContext();
    if (!contextResult.success || !contextResult.data) {
      res.status(400).json({
        success: false,
        message: "Invalid Devvit context - app must be accessed through Reddit"
      });
      return;
    }

    // Get current Reddit user through Reddit Compliance Service
    const userResult = await redditComplianceService.getCurrentRedditUser();
    if (!userResult.success || !userResult.data) {
      res.status(401).json({
        success: false,
        message: "Reddit authentication required"
      });
      return;
    }

    const currentUsername = userResult.data;

    // Validate session token if provided
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (sessionToken) {
      const validation = await authService.validateSession(sessionToken);
      if (!validation.isValid || !validation.user) {
        res.status(401).json({
          success: false,
          message: "Invalid session token"
        });
        return;
      }

      // Ensure the session user matches the current Reddit user
      if (validation.user.redditUsername !== currentUsername) {
        res.status(403).json({
          success: false,
          message: "Session user does not match current Reddit user"
        });
        return;
      }
    }

    // Use Reddit user ID as the primary identifier
    const userId = currentUsername; // In Devvit, username is the reliable identifier

    const exportOptions: ExportOptions = {
      format: req.body.format || 'json',
      includeMatchHistory: req.body.includeMatchHistory || false,
      includePersonalData: req.body.includePersonalData || false, // Default to false for privacy
      includeSubredditData: req.body.includeSubredditData || true,
      includeTrophies: req.body.includeTrophies || true
    };

    // Validate export request
    const validation_result = await dataExportService.validateExportRequest(userId, exportOptions);
    if (!validation_result.valid) {
      res.status(400).json({
        success: false,
        message: "Invalid export request",
        errors: validation_result.errors
      });
      return;
    }

    // Generate export
    const exportData = await dataExportService.exportUserData(userId, exportOptions);
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="pictact-profile-${userId}-${Date.now()}.json"`);

    // Log export activity for audit purposes (Reddit compliance)
    console.log(`Profile data export requested by Reddit user: ${currentUsername}, format: ${exportOptions.format}`);

    res.json({
      success: true,
      data: exportData,
      exportedAt: new Date().toISOString(),
      format: exportOptions.format,
      redditUser: currentUsername,
      subreddit: contextResult.data.subreddit
    });

  } catch (error) {
    console.error("Profile export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export profile data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/api/profile/export/estimate", async (req, res): Promise<void> => {
  try {
    // Verify Devvit context through Reddit Compliance Service
    const contextResult = await redditComplianceService.getDevvitContext();
    if (!contextResult.success || !contextResult.data) {
      res.status(400).json({
        success: false,
        message: "Invalid Devvit context - app must be accessed through Reddit"
      });
      return;
    }

    // Get current Reddit user through Reddit Compliance Service
    const userResult = await redditComplianceService.getCurrentRedditUser();
    if (!userResult.success || !userResult.data) {
      res.status(401).json({
        success: false,
        message: "Reddit authentication required"
      });
      return;
    }

    const currentUsername = userResult.data;

    // Use Reddit username as the primary identifier
    const userId = currentUsername;
    
    const format = (req.query.format as string) || 'json';
    const exportOptions: ExportOptions = {
      format: format as ExportFormat,
      includeMatchHistory: req.query.includeMatchHistory === 'true',
      includePersonalData: req.query.includePersonalData === 'true', // Explicit opt-in for privacy
      includeSubredditData: req.query.includeSubredditData !== 'false',
      includeTrophies: req.query.includeTrophies !== 'false'
    };

    const estimatedSize = await dataExportService.getExportSizeEstimate(userId, exportOptions);
    
    res.json({
      success: true,
      estimatedSizeBytes: estimatedSize,
      estimatedSizeKB: Math.round(estimatedSize / 1024),
      format: exportOptions.format,
      redditUser: currentUsername
    });

  } catch (error) {
    console.error("Export size estimate error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to estimate export size",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Live games endpoint
router.get("/api/games/live", async (_req, res): Promise<void> => {
  try {
    // For now, return empty array since we don't have active games yet
    // TODO: Implement actual game fetching from Reddit posts/comments
    res.json([]);
  } catch (error) {
    console.error("Get live games error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get live games"
    });
  }
});

// Upcoming events endpoint
router.get("/api/events/upcoming", async (_req, res): Promise<void> => {
  try {
    // For now, return empty array since we don't have scheduled events yet
    // TODO: Implement actual event fetching from Reddit scheduled posts
    res.json([]);
  } catch (error) {
    console.error("Get upcoming events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get upcoming events"
    });
  }
});

// Leaderboard endpoint
router.get("/api/leaderboard", async (_req, res): Promise<void> => {
  try {
    // For now, return empty array since we don't have player data yet
    // TODO: Implement actual leaderboard from Reddit user data
    res.json([]);
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get leaderboard"
    });
  }
});

// Internal Devvit endpoints
router.post("/internal/menu/post-create", async (req, res): Promise<void> => {
  try {
    // Get Devvit context
    const contextResult = await redditComplianceService.getDevvitContext();
    if (!contextResult.success || !contextResult.data) {
      res.status(400).json({
        success: false,
        message: "Invalid Devvit context"
      });
      return;
    }

    // Get current Reddit user
    const userResult = await redditComplianceService.getCurrentRedditUser();
    if (!userResult.success || !userResult.data) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    // Check if user is a moderator
    const modPermsResult = await redditComplianceService.getModeratorPermissions(
      contextResult.data.subreddit, 
      userResult.data
    );
    
    if (!modPermsResult.success || !modPermsResult.data?.canManagePosts) {
      res.status(403).json({
        success: false,
        message: "Moderator permissions required to create events"
      });
      return;
    }

    // Redirect to create event page
    res.json({
      success: true,
      redirect: "create-event.html",
      message: "Redirecting to event creation page"
    });

  } catch (error) {
    console.error("Menu post-create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to handle menu action"
    });
  }
});

router.post("/internal/on-app-install", async (req, res): Promise<void> => {
  try {
    // Get Devvit context
    const contextResult = await redditComplianceService.getDevvitContext();
    if (!contextResult.success || !contextResult.data) {
      console.error("App install: Failed to get context");
      res.status(400).json({
        success: false,
        message: "Invalid context"
      });
      return;
    }

    const subreddit = contextResult.data.subreddit;
    console.log(`PicTact app installed in r/${subreddit}`);

    // Log the installation
    await redditComplianceService.logModeratorAction(
      subreddit,
      'app_install',
      'pictact',
      'PicTact app installed in subreddit'
    );

    // You could also create a welcome post or setup initial configuration here
    
    res.json({
      success: true,
      message: `PicTact successfully installed in r/${subreddit}!`
    });

  } catch (error) {
    console.error("App install error:", error);
    res.status(500).json({
      success: false,
      message: "Installation failed"
    });
  }
});

app.use(router);

const server = createServer(app);
export default server;
# PicTact - Real-Time Image Hunt Challenges on Reddit

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [MVP Cut Sheet](#mvp-cut-sheet)
- [Submission UX & Timestamp of Record](#submission-ux--timestamp-of-record)
- [Real-time Update Strategy](#real-time-update-strategy)
- [Submission Validity Rules](#submission-validity-rules)
- [Tie-Breaking & Latency Policy](#tie-breaking--latency-policy)
- [Moderator Playbook & Audit Trail](#moderator-playbook--audit-trail)
- [System Architecture](#system-architecture)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Core Features Implementation](#core-features-implementation)
- [KV Schema Versioning & Backup](#kv-schema-versioning--backup)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Rate Limits & Quotas](#rate-limits--quotas)
- [Frontend Components](#frontend-components)
- [Game Flow & Logic](#game-flow--logic)
- [User Roles & Permissions](#user-roles--permissions)
- [Points & Rewards System](#points--rewards-system)
- [Validation & Voting System](#validation--voting-system)
- [Edge Cases & Failure Modes](#edge-cases--failure-modes)
- [Accessibility & Mobile UX](#accessibility--mobile-ux)
- [Observability & Monitoring](#observability--monitoring)
- [App Review Readiness](#app-review-readiness)
- [Deployment Guide](#deployment-guide)
- [Testing Strategy](#testing-strategy)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Data Retention & Privacy](#data-retention--privacy)
- [Incident & Rollback Plan](#incident--rollback-plan)
- [Legal & Policy](#legal--policy)
- [Troubleshooting](#troubleshooting)
- [Future Roadmap](#future-roadmap)

---

## 🎯 Project Overview

**PicTact** is a real-time image hunting game platform built on Reddit's Devvit framework. It transforms subreddits into competitive game arenas where moderators create challenges and players race to find and submit the first valid image matching specific prompts.

### Key Features
- **Real-time Challenges**: Fast-paced image hunting competitions
- **Dual Validation System**: Community voting + moderator override
- **Points & Leaderboards**: Global and subreddit-specific rankings
- **Custom Trophies**: Moderator-customizable awards
- **Multiple Game Modes**: Speed hunts, retro challenges, brand quests
- **Professional UI**: Custom game interface within Reddit posts
- **Mobile Optimized**: Touch-friendly responsive design

### Target Communities
- Gaming enthusiasts (console collectors, retro gamers)
- Collectors (trading cards, vinyl records, memorabilia)
- Local communities (city landmarks, local businesses)
- Educational groups (historical artifacts, scientific specimens)

---

## 📦 MVP Cut Sheet

### ✅ In Scope for Initial Release
- **Challenge Creation**: Moderators create timed challenges with clear prompts
- **Live Submission Round**: Players submit images via Reddit comments
- **First Valid Image Wins**: Clear timestamp-based winner determination
- **Points System**: Basic point awards (participation, winning, hosting)
- **Leaderboards**: Subreddit-specific and monthly rankings
- **Moderator Override**: Manual validation with required reasoning
- **Anti-Spam**: Account age ≥ 7 days, karma > 10, one submission per round
- **Basic UI**: Custom post interface for challenge display and interaction

### ❌ Out of Scope (Deferred to Future Phases)
- ~~WebSocket real-time updates~~ → Short polling instead
- ~~Reputation-weighted voting~~ → Simple majority voting
- ~~Reverse image search~~ → Manual moderator verification
- ~~Cross-subreddit tournaments~~ → Single subreddit focus
- ~~Global leaderboards~~ → Subreddit-specific only
- ~~Custom trophy uploads~~ → Default trophy system
- ~~Team challenges~~ → Individual competition only
- ~~Advanced image analysis~~ → Basic format validation
- ~~AR/VR features~~ → Web-only interface
- ~~Blockchain integration~~ → Traditional database storage

### 🎯 MVP Success Criteria
- Moderator can create challenge in under 2 minutes
- Players can submit images within 30 seconds of challenge start
- Winner determination is instant and transparent
- Zero manual intervention needed for 80% of challenges
- Mobile-responsive interface works on all major browsers
- Passes Devvit app review on first submission

---

## 📱 Submission UX & Timestamp of Record

### Challenge Location
**Challenge lives in**: Custom Reddit Post with embedded webapp
- Each challenge creates a dedicated Reddit post in the subreddit
- Post title: `[PicTact Challenge] {Challenge Title}`
- Post contains embedded webapp showing challenge details and submission interface

### Submission Flow
```
1. Player opens challenge post → Sees embedded webapp
2. Challenge timer counts down → Submit button becomes active
3. Player clicks "Submit Image" → Reddit's native image uploader opens
4. Player uploads image → Reddit processes and hosts the image
5. Player adds optional description → Clicks "Submit Entry"
6. App creates Reddit comment on challenge post with image attached
7. Comment timestamp becomes official submission time
```

### Technical Implementation
```typescript
// Submission Process
interface SubmissionFlow {
  1. Frontend: User clicks submit in webapp
  2. Reddit API: Upload image via reddit.uploadMedia()
  3. Reddit API: Create comment with uploaded image
  4. Backend: Parse new comment, validate image
  5. Redis: Store submission with Reddit comment timestamp
  6. Real-time: Update all clients via polling
}

// Comment Format (Auto-generated)
const submissionComment = {
  body: `🎯 PicTact Submission\n![Submission](${imageUrl})\n${userDescription || ''}`,
  media: redditImageId,
  timestamp: redditCommentTimestamp, // OFFICIAL TIMESTAMP
  id: redditCommentId // Used for tie-breaking
}
```

### Timestamp of Record Rules
**Final Authority**: Reddit comment timestamp (UTC)
- **Primary**: `comment.created_utc` from Reddit API
- **Tie-breaker**: Lower Reddit comment ID (`comment.id`) wins
- **Server time is IGNORED** - only used for internal processing
- **Edit detection**: If comment edited, original timestamp preserved but marked for review

### What Happens When...
```typescript
// User edits their submission comment
if (comment.edited) {
  submission.status = 'under_review';
  submission.flags.push('edited_after_submission');
  // Moderator must manually re-validate
}

// Image link breaks/deleted
if (!imageAccessible) {
  submission.status = 'invalid';
  submission.reason = 'image_unavailable';
  // Automatic disqualification
}

// Comment gets deleted
if (comment.deleted) {
  submission.status = 'disqualified';
  submission.reason = 'comment_deleted';
  // Cannot be restored
}
```

---

## ⚡ Real-time Update Strategy

### Devvit Constraints Reality Check
**No Direct WebSockets**: Devvit embedded apps have limited real-time capabilities
- WebSocket connections often blocked in Reddit's iframe context
- Must use Reddit-approved real-time patterns

### Chosen Strategy: Smart Short Polling
```typescript
// Polling Configuration
const POLLING_CONFIG = {
  active_challenge: 2000,    // 2 seconds during active submission
  voting_phase: 1000,       // 1 second during voting
  idle_state: 10000,        // 10 seconds when no active challenge
  background_tab: 30000,    // 30 seconds when tab not focused
}

// Payload Optimization
interface PollingResponse {
  timestamp: number;
  challenge_state: 'waiting' | 'active' | 'voting' | 'completed';
  time_remaining: number;
  submission_count: number;
  latest_submissions?: SubmissionPreview[]; // Only if changed
  user_status: 'not_submitted' | 'submitted' | 'voted';
}
```

### Smart Polling Implementation
```typescript
class PicTactRealtime {
  private pollInterval: number = POLLING_CONFIG.idle_state;
  private lastUpdate: number = 0;
  
  startPolling() {
    setInterval(() => {
      this.adjustPollingRate();
      this.fetchUpdates();
    }, this.pollInterval);
  }
  
  adjustPollingRate() {
    const challengeState = this.getCurrentChallengeState();
    this.pollInterval = POLLING_CONFIG[challengeState] || POLLING_CONFIG.idle_state;
    
    // Slow down if tab not focused
    if (document.hidden) {
      this.pollInterval = POLLING_CONFIG.background_tab;
    }
  }
  
  async fetchUpdates() {
    const response = await fetch(`/api/v1/challenges/${challengeId}/updates?since=${this.lastUpdate}`);
    const data = await response.json();
    
    if (data.timestamp > this.lastUpdate) {
      this.updateUI(data);
      this.lastUpdate = data.timestamp;
    }
  }
}
```

### Fallback Strategy
- **Primary**: Short polling with smart intervals
- **Fallback**: Reddit's native comment notifications
- **Emergency**: Manual refresh button always available

---

## ✅ Submission Validity Rules

### Copy-Ready Rules (For UI Display)

#### Image Requirements
- **Must match ALL prompt qualifiers**: title, edition, region, year, condition
- **Image must be directly visible**: Reddit-hosted media or direct image links only
- **No paywalled/login-required links**: Image must be publicly accessible
- **No collages or edits**: Single, unaltered image that preserves authenticity
- **Clear view of key identifiers**: Text, logos, and distinguishing features must be readable

#### Submission Rules
- **One submission per user per round**: Latest submission replaces any earlier ones
- **Submitted during active window only**: No submissions accepted after deadline
- **Account requirements**: Reddit account age ≥ 7 days, karma ≥ 10
- **Subreddit participation**: Must be subscribed to subreddit where challenge is hosted

#### Disallowed Content
- **NSFW images**: Not safe for work content of any kind
- **Watermarks blocking identifiers**: Digital watermarks covering key details
- **AI-generated images**: Unless explicitly allowed in challenge prompt
- **Screenshot of other submissions**: No copying from other players' entries
- **Stock photos/generic images**: Must be specific item matching prompt

### Validation Process
```typescript
interface ValidationChecks {
  format_check: boolean;      // JPEG, PNG, GIF under 10MB
  accessibility_check: boolean; // Direct Reddit media link
  timing_check: boolean;      // Submitted during active window
  account_check: boolean;     // Age and karma requirements
  duplicate_check: boolean;   // Not identical to existing submission
  content_check: 'pending' | 'approved' | 'rejected'; // Moderator review
}

// Auto-validation (immediate)
const autoValidation = [
  'format_check',
  'accessibility_check', 
  'timing_check',
  'account_check',
  'duplicate_check'
];

// Manual validation (moderator required)
const manualValidation = [
  'content_check' // Matches prompt requirements
];
```

---

## ⏱️ Tie-Breaking & Latency Policy

### Hard Rule (Copy-Pastable)
> **Winner Determination**: The winner is the earliest Reddit comment timestamp (UTC) containing a valid image that satisfies the challenge prompt. If two submissions share the exact same second timestamp, the submission with the lower Reddit comment ID wins. Moderators may override this determination only for rule misclassification (e.g., image doesn't match prompt requirements).

### Example Scenario
```
Challenge: "Find the NTSC-U Xbox 360 cover for Halo 3 Limited Edition"

Submission A: Posted at 2025-09-10 15:30:42 UTC, Comment ID: abc123
- Image: Halo 3 Standard Edition (wrong version)

Submission B: Posted at 2025-09-10 15:30:45 UTC, Comment ID: def456  
- Image: Halo 3 Limited Edition NTSC-U (correct!)

Submission C: Posted at 2025-09-10 15:30:45 UTC, Comment ID: def455
- Image: Halo 3 Limited Edition PAL (wrong region)

Winner: Submission B (earliest valid timestamp)
Note: Submission C has lower comment ID than B, but wrong region makes it invalid
```

### Appeal Window
- **Duration**: 24 hours after challenge completion
- **Grounds**: Technical error, incorrect disqualification, or moderator bias
- **Process**: Direct message to moderator with evidence
- **Resolution**: Moderator must respond within 48 hours with reasoning
- **Final Appeal**: Community vote if original moderator unavailable

### Latency Handling
```typescript
// Server-side timestamp validation
interface TimestampValidation {
  reddit_timestamp: number;     // Official Reddit comment time (UTC)
  server_received: number;      // When our server processed it
  challenge_deadline: number;   // Challenge end time (UTC)
  
  is_valid: boolean;           // reddit_timestamp <= challenge_deadline
  latency_seconds: number;     // server_received - reddit_timestamp
}

// Rule: Reddit timestamp is authoritative, regardless of processing delay
const isSubmissionValid = (submission: Submission) => {
  return submission.reddit_timestamp <= challenge.end_time;
  // Server processing delay is irrelevant
}
```

---

## 📋 Moderator Playbook & Audit Trail

### Quick Decision Guide
```
✅ APPROVE when:
- Image exactly matches all prompt criteria
- Clearly visible and unedited
- Submitted within time window
- No rule violations

❌ REJECT when:
- Missing any prompt qualifiers (wrong edition, region, year)
- Image altered/edited in misleading way
- NSFW content or policy violations
- Duplicate/stolen from another submission
- Account doesn't meet requirements

🤔 OVERRIDE NEEDED when:
- Community vote conflicts with prompt accuracy
- Technical knowledge required (regional variants)
- Edge case not covered in standard rules
```

### Moderator Interface Workflow
```typescript
// Validation Dashboard
interface ModeratorDashboard {
  pending_validations: {
    submission: Submission;
    community_vote: VoteSummary;
    time_remaining: number;
    quick_approve_button: boolean;
    quick_reject_button: boolean;
    require_reason: boolean;
  }[];
  
  recent_decisions: {
    decision: 'approved' | 'rejected' | 'override';
    reasoning: string;
    community_agreement: number; // % who agreed with mod
    appeals_filed: number;
  }[];
}

// Decision Recording
interface ModeratorDecision {
  decision_id: string;
  submission_id: string;
  challenge_id: string;
  moderator_id: string;
  decision: 'approve' | 'reject';
  reasoning: string; // REQUIRED for all decisions
  community_votes_before: VoteSummary;
  override_used: boolean;
  decision_timestamp: Date;
  appeal_deadline: Date;
  confidence_level: 1 | 2 | 3 | 4 | 5; // Self-reported
}
```

### Standard Decision Reasons (Dropdown)
- ✅ "Perfect match - all criteria satisfied"
- ✅ "Correct with minor acceptable variation"
- ❌ "Wrong edition/version"
- ❌ "Wrong region (NTSC vs PAL vs other)"
- ❌ "Wrong year/release date"
- ❌ "Image quality insufficient to verify"
- ❌ "Altered/edited image"
- ❌ "NSFW content"
- ❌ "Duplicate submission"
- ❌ "Account requirements not met"
- 🔄 "Community feedback requested"
- 🔄 "Need expert verification"

### Audit Trail Storage
```typescript
// Complete decision history
interface AuditTrail {
  moderator_decisions: ModeratorDecision[];
  appeals_filed: Appeal[];
  community_feedback: CommunityFeedback[];
  accuracy_metrics: {
    total_decisions: number;
    community_agreement_rate: number;
    appeal_success_rate: number;
    average_decision_time: number;
  };
}

// Exportable for transparency
const exportAuditTrail = (challengeId: string) => {
  return {
    challenge_summary: Challenge,
    all_submissions: Submission[],
    all_decisions: ModeratorDecision[],
    all_appeals: Appeal[],
    final_results: ChallengeResults
  };
}
```

### Moderator Performance Tracking
```typescript
interface ModeratorMetrics {
  decisions_per_week: number;
  community_agreement_rate: number; // % of decisions community agreed with
  appeal_rate: number; // % of decisions that were appealed
  successful_appeals: number; // Appeals that were upheld
  average_response_time: number; // Minutes to make decision
  accuracy_trend: number[]; // Week-over-week accuracy
}
```

---

## 🏗️ System Architecture

### Technology Stack
- **Platform**: Reddit Devvit
- **Frontend**: HTML5, CSS3, TypeScript, Vite
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: Reddit Redis (key-value store)
- **Real-time**: WebSocket connections
- **File Handling**: Devvit file upload system
- **Build System**: Vite with TypeScript compilation

### Architecture Patterns
- **MVC Pattern**: Model-View-Controller separation
- **Event-Driven**: Real-time updates via short polling (not WebSocket)
- **State Management**: Centralized game state in Redis
- **Component-Based UI**: Modular frontend components
- **API-First Design**: RESTful backend services with minimal scope

### Platform Reality Check
**Express Backend Scope**: Limited to core game functions only
- Challenge CRUD operations
- Submission handling and validation
- Basic voting and point calculation
- Leaderboard updates
- **OUT OF SCOPE**: Reverse image search, heavy image processing, external APIs

### Data Flow
```
User Action → Frontend → API Endpoint → Redis → Short Polling Update → All Connected Users
```

---

## 🔐 KV Schema Versioning & Backup

### Schema Version Management
```typescript
// Version Control Keys
const SCHEMA_KEYS = {
  version: 'config:schema_version',
  migration_log: 'migrations:log',
  backup_metadata: 'backups:metadata'
};

// Current Schema Version
interface SchemaVersion {
  version: '1.0.0';
  applied_at: Date;
  migration_id: string;
  rollback_available: boolean;
}

// Schema Migrations
interface Migration {
  id: string;
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  required_keys: string[];
  validates?: () => Promise<boolean>;
}
```

### Migration Runner (Idempotent)
```typescript
class MigrationRunner {
  async runMigrations() {
    const currentVersion = await redis.get(SCHEMA_KEYS.version);
    const pendingMigrations = this.getPendingMigrations(currentVersion);
    
    for (const migration of pendingMigrations) {
      try {
        await this.runMigration(migration);
        await this.logMigration(migration);
      } catch (error) {
        await this.rollbackMigration(migration);
        throw error;
      }
    }
  }
  
  async runMigration(migration: Migration) {
    // Validate pre-conditions
    if (migration.validates && !(await migration.validates())) {
      throw new Error(`Migration ${migration.id} validation failed`);
    }
    
    // Create backup point
    await this.createBackup(migration.required_keys);
    
    // Run migration
    await migration.up();
    
    // Update version
    await redis.set(SCHEMA_KEYS.version, migration.version);
  }
}
```

### Backup Strategy
```typescript
interface BackupConfig {
  hot_keys: string[]; // Critical data that needs frequent backup
  warm_keys: string[]; // Important data, less frequent backup
  cold_keys: string[]; // Archive data, infrequent backup
}

const BACKUP_CONFIG: BackupConfig = {
  hot_keys: [
    'challenges:active:*',
    'gamestate:*',
    'leaderboard:*',
    'users:points:*'
  ],
  warm_keys: [
    'challenges:*',
    'users:*',
    'submissions:*'
  ],
  cold_keys: [
    'stats:daily:*',
    'cache:*',
    'migrations:*'
  ]
};

// Backup Implementation
class BackupManager {
  async createSnapshot(keys: string[]) {
    const timestamp = Date.now();
    const backup = {
      id: `backup_${timestamp}`,
      created_at: new Date(),
      keys: keys,
      data: {}
    };
    
    for (const keyPattern of keys) {
      const matchingKeys = await redis.keys(keyPattern);
      for (const key of matchingKeys) {
        backup.data[key] = await redis.get(key);
      }
    }
    
    // Store backup (compressed)
    const compressed = this.compress(backup);
    await redis.set(`backups:${backup.id}`, compressed);
    
    return backup.id;
  }
  
  async restoreFromSnapshot(backupId: string) {
    const backup = await redis.get(`backups:${backupId}`);
    const decompressed = this.decompress(backup);
    
    // Restore all keys
    for (const [key, value] of Object.entries(decompressed.data)) {
      await redis.set(key, value);
    }
  }
}
```

### Export/Import for Development
```typescript
// Export hot data for local development
async function exportGameData() {
  const hotKeys = await redis.keys('challenges:active:*');
  const leaderboards = await redis.keys('leaderboard:*');
  const userPoints = await redis.keys('users:points:*');
  
  const exportData = {
    timestamp: Date.now(),
    active_challenges: await this.exportKeys(hotKeys),
    leaderboards: await this.exportKeys(leaderboards),
    user_points: await this.exportKeys(userPoints)
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Import for local setup
async function importGameData(jsonData: string) {
  const data = JSON.parse(jsonData);
  
  // Import active challenges
  for (const [key, value] of Object.entries(data.active_challenges)) {
    await redis.set(key, value);
  }
  
  // Set TTL for active challenges
  const activeKeys = Object.keys(data.active_challenges);
  for (const key of activeKeys) {
    await redis.expire(key, 3600); // 1 hour TTL for dev data
  }
}
```

---

## 🚀 Development Environment Setup

### Prerequisites
- **Node.js**: Version 22+ (LTS recommended)
- **npm**: Version 10+ (comes with Node.js)
- **Reddit Account**: For Devvit developer access
- **VS Code**: Recommended IDE with extensions

### Initial Setup
```bash
# 1. Clone the repository
git clone <your-repo-url>
cd pictact

# 2. Install dependencies
npm install

# 3. Login to Devvit
npm run login

# 4. Configure development environment
cp .env.example .env
# Edit .env with your configuration

# 5. Start development server
npm run dev
```

### Required VS Code Extensions
- **Devvit Extension**: Official Reddit Devvit support
- **TypeScript Hero**: Enhanced TypeScript features
- **ES7+ React/Redux/React-Native snippets**: Code snippets
- **Prettier**: Code formatting
- **ESLint**: Code linting

### Environment Variables
```env
# Development Configuration
DEVVIT_SUBREDDIT=pictact_dev
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
MAX_UPLOAD_SIZE=10MB
GAME_TIMEOUT=300000
VOTING_TIMEOUT=60000
```

---

## 📁 Project Structure

```
pictact/
├── devvit.json              # Devvit configuration
├── package.json             # Project dependencies
├── tsconfig.json           # TypeScript configuration
├── README.md               # Basic project info
├── PICTACT_DOCUMENTATION.md # This comprehensive guide
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
│
├── src/
│   ├── client/             # Frontend application
│   │   ├── index.html      # Main HTML template
│   │   ├── main.ts         # Frontend entry point
│   │   ├── style.css       # Global styles
│   │   ├── tsconfig.json   # Client TypeScript config
│   │   ├── vite.config.ts  # Vite build configuration
│   │   │
│   │   ├── components/     # UI Components
│   │   │   ├── ChallengeCreator.ts
│   │   │   ├── GameInterface.ts
│   │   │   ├── SubmissionHandler.ts
│   │   │   ├── VotingInterface.ts
│   │   │   ├── Leaderboard.ts
│   │   │   ├── UserProfile.ts
│   │   │   └── TrophyDisplay.ts
│   │   │
│   │   ├── services/       # Frontend Services
│   │   │   ├── apiClient.ts
│   │   │   ├── websocket.ts
│   │   │   ├── gameState.ts
│   │   │   └── imageUpload.ts
│   │   │
│   │   ├── types/          # Frontend Type Definitions
│   │   │   ├── game.ts
│   │   │   ├── user.ts
│   │   │   └── ui.ts
│   │   │
│   │   ├── utils/          # Utility Functions
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   └── constants.ts
│   │   │
│   │   └── public/         # Static Assets
│   │       ├── snoo.png
│   │       ├── trophies/   # Default trophy images
│   │       └── icons/      # UI icons
│   │
│   ├── server/             # Backend application
│   │   ├── index.ts        # Server entry point
│   │   ├── tsconfig.json   # Server TypeScript config
│   │   ├── vite.config.ts  # Server build configuration
│   │   │
│   │   ├── controllers/    # Request Handlers
│   │   │   ├── challengeController.ts
│   │   │   ├── submissionController.ts
│   │   │   ├── votingController.ts
│   │   │   ├── leaderboardController.ts
│   │   │   ├── userController.ts
│   │   │   └── moderatorController.ts
│   │   │
│   │   ├── services/       # Business Logic
│   │   │   ├── challengeService.ts
│   │   │   ├── submissionService.ts
│   │   │   ├── votingService.ts
│   │   │   ├── pointsService.ts
│   │   │   ├── leaderboardService.ts
│   │   │   ├── imageValidationService.ts
│   │   │   └── notificationService.ts
│   │   │
│   │   ├── models/         # Data Models
│   │   │   ├── Challenge.ts
│   │   │   ├── Submission.ts
│   │   │   ├── User.ts
│   │   │   ├── Vote.ts
│   │   │   └── Trophy.ts
│   │   │
│   │   ├── middleware/     # Express Middleware
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── errorHandler.ts
│   │   │
│   │   ├── routes/         # API Routes
│   │   │   ├── challenges.ts
│   │   │   ├── submissions.ts
│   │   │   ├── votes.ts
│   │   │   ├── leaderboards.ts
│   │   │   ├── users.ts
│   │   │   └── moderator.ts
│   │   │
│   │   └── utils/          # Server Utilities
│   │       ├── redis.ts
│   │       ├── validation.ts
│   │       ├── imageProcessing.ts
│   │       └── scheduler.ts
│   │
│   └── shared/             # Shared Types & Utilities
│       ├── types/
│       │   ├── api.ts      # API request/response types
│       │   ├── game.ts     # Game-related types
│       │   ├── user.ts     # User-related types
│       │   └── database.ts # Database schema types
│       │
│       ├── constants/
│       │   ├── gameConfig.ts
│       │   ├── pointsConfig.ts
│       │   └── validationRules.ts
│       │
│       └── utils/
│           ├── validation.ts
│           ├── formatting.ts
│           └── gameLogic.ts
│
├── tools/                  # Build Tools
│   ├── tsconfig-base.json  # Base TypeScript config
│   ├── build-scripts/      # Custom build scripts
│   └── deployment/         # Deployment configurations
│
└── docs/                   # Additional Documentation
    ├── api-reference.md    # API endpoint documentation
    ├── game-rules.md       # Game rules and mechanics
    ├── moderator-guide.md  # Guide for moderators
    └── player-guide.md     # Guide for players
```

---

## 🎮 Core Features Implementation

### 1. Challenge Creation System
```typescript
// Challenge Model
interface Challenge {
  id: string;
  title: string;
  description: string;
  prompt: string;
  createdBy: string; // Reddit username
  subreddit: string;
  startTime: Date;
  endTime: Date;
  maxParticipants?: number;
  allowedUsers?: string[]; // For private challenges
  customTrophy?: string; // URL to custom trophy image
  pointsReward: number;
  bonusPoints: number;
  status: 'pending' | 'active' | 'voting' | 'completed' | 'cancelled';
  rules: string[];
  category: string; // 'gaming', 'collecting', 'local', 'general'
}

// Challenge Creation Flow
1. Moderator opens challenge creator
2. Fills in challenge details and rules
3. Sets time limits and participant restrictions
4. Uploads custom trophy (optional)
5. Reviews and publishes challenge
6. System creates Redis entries and notifies users
```

### 2. Real-Time Submission System
```typescript
// Submission Model
interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  username: string;
  imageUrl: string;
  imageHash: string; // For duplicate detection
  submissionTime: Date;
  description?: string;
  votes: number;
  status: 'pending' | 'approved' | 'rejected' | 'winner';
  moderatorNotes?: string;
}

// Submission Flow
1. Player uploads image through drag-drop or file picker
2. Frontend validates file size and format
3. Image uploaded to Reddit's file system
4. Backend processes and validates image
5. Real-time notification to all challenge participants
6. Image appears in submission feed
```

### 3. Dual Validation System
```typescript
// Voting Model
interface Vote {
  id: string;
  submissionId: string;
  challengeId: string;
  userId: string;
  voteType: 'approve' | 'reject';
  weight: number; // Based on user reputation
  timestamp: Date;
}

// Validation Process
1. Community voting period (60 seconds default)
2. Real-time vote aggregation and display
3. Moderator review interface with community sentiment
4. Moderator can approve community choice or override
5. Winner selection with transparent reasoning
6. Points distribution and trophy award
```

### 4. Points & Achievement System
```typescript
// User Profile Model
interface UserProfile {
  userId: string;
  username: string;
  totalPoints: number;
  subredditPoints: { [subreddit: string]: number };
  achievements: Achievement[];
  trophies: Trophy[];
  stats: {
    challengesWon: number;
    challengesParticipated: number;
    averageRating: number;
    winStreak: number;
    longestStreak: number;
    favoriteCategory: string;
  };
  reputation: number; // Affects vote weight
  joinDate: Date;
  lastActive: Date;
}

// Points Distribution
- Participation: 10 points
- Winning challenge: 100 points + bonus
- Community votes: 5 points per vote received
- Moderator hosting: 50 points per successful challenge
- Achievement unlocks: Variable points
- Streak bonuses: Multiplier based on consecutive wins
```

---

## 🗄️ Database Schema

### Redis Key Structure
```
# Challenge Data
challenges:{challengeId}                    # Challenge details
challenges:active:{subreddit}               # List of active challenges
challenges:user:{userId}                    # User's created challenges
challenges:category:{category}              # Challenges by category

# Submission Data
submissions:{challengeId}                   # All submissions for challenge
submissions:user:{userId}                   # User's submissions
submissions:pending:{challengeId}           # Pending validation
submission:{submissionId}                   # Individual submission details

# Voting Data
votes:{submissionId}                        # All votes for submission
votes:user:{userId}:{challengeId}          # User's vote in challenge
voting:active:{challengeId}                 # Active voting sessions

# User Data
users:{userId}                              # User profile and stats
users:points:{userId}                       # User points breakdown
users:achievements:{userId}                 # User achievements
users:trophies:{userId}                     # User trophy collection

# Leaderboard Data
leaderboard:global                          # Global point rankings
leaderboard:subreddit:{subreddit}          # Subreddit rankings
leaderboard:monthly:{year}-{month}         # Monthly competitions
leaderboard:category:{category}            # Category specialists

# Game State
gamestate:{challengeId}                     # Real-time game state
notifications:{userId}                      # User notifications
sessions:active                             # Active user sessions

# Moderator Data
moderators:{subreddit}                      # Subreddit moderators
mod:settings:{userId}                       # Moderator preferences
mod:trophies:{userId}                       # Custom trophy designs

# System Data
config:global                               # Global system settings
stats:daily:{date}                          # Daily usage statistics
cache:images:{hash}                         # Image processing cache
```

### Data Relationships
```
Challenge (1) → (N) Submissions
Challenge (1) → (1) User (creator)
Submission (1) → (N) Votes
Submission (1) → (1) User (submitter)
User (1) → (N) Achievements
User (1) → (N) Trophies
```

---

## ⚖️ Rate Limits & Quotas

### Reddit API Limits
```typescript
// Reddit Platform Constraints
const REDDIT_LIMITS = {
  comments_per_minute: 30,          // Reddit's comment rate limit
  media_uploads_per_hour: 100,      // Image upload limit
  api_requests_per_minute: 60,      // General API calls
  post_creation_per_hour: 10,       // Challenge posts
}

// PicTact App Limits (More Restrictive)
const APP_LIMITS = {
  challenge_creation_per_hour: 3,   // Prevent spam challenges
  submissions_per_challenge: 1,     // One per user per challenge
  votes_per_minute: 10,            // Prevent rapid voting
  joins_per_minute: 5,             // Rate limit challenge joins
  api_calls_per_user_per_minute: 20 // Per-user API throttle
}
```

### Rate Limiting Implementation
```typescript
class RateLimiter {
  private limits = new Map<string, number[]>();
  
  async checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old timestamps
    const timestamps = this.limits.get(key) || [];
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    if (validTimestamps.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    this.limits.set(key, validTimestamps);
    
    return true;
  }
  
  async rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const endpoint = req.route.path;
    const key = `${userId}:${endpoint}`;
    
    const allowed = await this.checkLimit(key, APP_LIMITS.api_calls_per_user_per_minute, 60000);
    
    if (!allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after: 60000,
        message: 'Please slow down and try again in a minute'
      });
    }
    
    next();
  }
}
```

### Fallback Strategies
```typescript
// Queue System for High Load
class SubmissionQueue {
  private queue: SubmissionRequest[] = [];
  private processing = false;
  
  async addSubmission(submission: SubmissionRequest) {
    // Add to queue with exponential backoff
    this.queue.push({
      ...submission,
      attempts: 0,
      next_retry: Date.now()
    });
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const submission = this.queue.shift()!;
      
      try {
        await this.processSubmission(submission);
      } catch (error) {
        // Exponential backoff retry
        if (submission.attempts < 3) {
          submission.attempts++;
          submission.next_retry = Date.now() + (1000 * Math.pow(2, submission.attempts));
          this.queue.push(submission);
        }
      }
      
      // Rate limit processing
      await this.delay(1000); // 1 second between submissions
    }
    
    this.processing = false;
  }
}
```

---

## ❗ Edge Cases & Failure Modes

### Submission Edge Cases
```typescript
interface EdgeCaseHandling {
  deleted_comment: {
    detection: 'Reddit API returns null or deleted flag';
    action: 'Automatic disqualification';
    recovery: 'Cannot be restored - submission lost';
    notification: 'User notified of disqualification';
  };
  
  edited_submission: {
    detection: 'Reddit comment edited flag';
    action: 'Flag for moderator review';
    recovery: 'Moderator can approve original or reject';
    notification: 'Moderator dashboard alert';
  };
  
  broken_image_link: {
    detection: 'HTTP 404 or image load failure';
    action: 'Mark submission as invalid';
    recovery: 'User can resubmit if within time window';
    notification: 'Real-time UI update showing broken link';
  };
  
  soft_banned_user: {
    detection: 'Reddit shadowban or subreddit ban';
    action: 'Comments invisible to others but user sees them';
    recovery: 'Manual moderator override possible';
    notification: 'Moderator sees warning in dashboard';
  };
  
  simultaneous_submissions: {
    detection: 'Same second timestamps';
    action: 'Use Reddit comment ID as tiebreaker';
    recovery: 'Deterministic - no intervention needed';
    notification: 'Both users see "photo finish" message';
  };
}
```

### System Failure Modes
```typescript
interface FailureModes {
  reddit_api_down: {
    detection: 'API requests timeout or return 503';
    graceful_degradation: 'Queue submissions, extend challenge time';
    user_message: 'Reddit is experiencing issues - submissions queued';
    recovery_plan: 'Process queue when API returns';
  };
  
  redis_connection_lost: {
    detection: 'Redis commands fail';
    graceful_degradation: 'Switch to in-memory cache temporarily';
    user_message: 'Temporary technical difficulty - data will be restored';
    recovery_plan: 'Sync memory cache back to Redis';
  };
  
  challenge_timer_desync: {
    detection: 'Server time vs displayed time mismatch > 5 seconds';
    graceful_degradation: 'Use server time as authoritative';
    user_message: 'Timer synchronized';
    recovery_plan: 'Force refresh all connected clients';
  };
  
  moderator_unavailable: {
    detection: 'No moderator action within 24 hours of challenge completion';
    graceful_degradation: 'Community vote decides winner automatically';
    user_message: 'Community vote determining winner';
    recovery_plan: 'Notify all subreddit moderators';
  };
}
```

### Error Handling Implementation
```typescript
class ErrorHandler {
  async handleSubmissionError(error: Error, context: SubmissionContext) {
    switch (error.type) {
      case 'REDDIT_API_ERROR':
        await this.queueSubmission(context.submission);
        return { status: 'queued', message: 'Submission queued due to Reddit issues' };
      
      case 'IMAGE_INVALID':
        return { status: 'rejected', message: 'Image could not be processed' };
      
      case 'RATE_LIMIT':
        const retryAfter = this.calculateRetryDelay(context.userId);
        return { status: 'rate_limited', retry_after: retryAfter };
      
      case 'CHALLENGE_ENDED':
        return { status: 'too_late', message: 'Challenge submission period has ended' };
      
      default:
        this.logUnknownError(error, context);
        return { status: 'error', message: 'An unexpected error occurred' };
    }
  }
  
  async handleCriticalFailure(error: CriticalError) {
    // Pause all active challenges
    await this.pauseAllChallenges();
    
    // Notify all moderators
    await this.notifyModerators('SYSTEM_CRITICAL', error.message);
    
    // Display maintenance message to users
    await this.setMaintenanceMode(true);
  }
}
```

---

## ♿ Accessibility & Mobile UX

### Accessibility Requirements
```typescript
interface AccessibilityFeatures {
  keyboard_navigation: {
    tab_order: 'Logical flow through challenge elements';
    enter_key: 'Activates primary actions (submit, vote)';
    escape_key: 'Closes modals and cancels actions';
    arrow_keys: 'Navigate between submissions in grid';
  };
  
  screen_reader: {
    challenge_status: 'Announces time remaining and current phase';
    submission_count: 'Announces new submissions as they arrive';
    vote_results: 'Announces vote tallies and winner';
    error_messages: 'Clear, specific error descriptions';
  };
  
  visual_design: {
    color_blind_friendly: 'Status indicators use icons + color';
    high_contrast: 'Dark mode with sufficient contrast ratios';
    large_touch_targets: '44px minimum for mobile buttons';
    readable_fonts: '16px minimum font size';
  };
}
```

### Mobile-First Design
```css
/* Mobile-Optimized CSS */
.challenge-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  max-width: 100vw;
}

.submission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.submit-button {
  min-height: 48px; /* Large touch target */
  font-size: 18px;
  border-radius: 8px;
  margin: 16px 0;
}

.timer-display {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin: 20px 0;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .challenge-details {
    font-size: 16px;
    line-height: 1.5;
  }
  
  .submission-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
}
```

---

## 📊 Observability & Monitoring

### Moderator-Facing Dashboard
```typescript
interface ModeratorObservability {
  real_time_stats: {
    active_rounds: number;
    pending_validations: number;
    total_participants: number;
    submissions_per_minute: number;
  };
  
  recent_activity: {
    timestamp: Date;
    action: 'submission' | 'vote' | 'validation' | 'challenge_created';
    user: string;
    details: string;
  }[];
  
  system_health: {
    api_response_time: number;
    redis_status: 'healthy' | 'degraded' | 'down';
    error_rate: number;
    active_users: number;
  };
  
  panic_controls: {
    pause_all_rounds: () => void;
    extend_current_round: (minutes: number) => void;
    force_end_round: (challengeId: string) => void;
    broadcast_message: (message: string) => void;
  };
}
```

---

## ✅ App Review Readiness

### Devvit Permissions Justification
```json
{
  "permissions": {
    "reddit.read": {
      "justification": "Read subreddit posts and comments to validate submissions and determine timestamps",
      "usage": "Fetch challenge posts and submission comments for game validation"
    },
    "reddit.write": {
      "justification": "Create challenge posts and submission comments on behalf of users",
      "usage": "Post new challenges and submit images as comments when users participate"
    },
    "reddit.moderation": {
      "justification": "Allow moderators to validate submissions and override community votes",
      "usage": "Moderator dashboard and validation controls"
    },
    "reddit.media": {
      "justification": "Handle image uploads and display for challenge submissions",
      "usage": "Process and validate submitted images for challenges"
    }
  }
}
```

### Test Subreddit Setup
```typescript
// Test Environment Configuration
const TEST_CONFIG = {
  subreddit: 'pictact_devtest',
  test_moderators: ['pictact_testmod1', 'pictact_testmod2'],
  demo_accounts: ['pictact_player1', 'pictact_player2', 'pictact_player3'],
  sample_challenges: [
    {
      title: 'Gaming Challenge Demo',
      prompt: 'Find a Nintendo Game Boy game cartridge',
      duration: 300 // 5 minutes
    }
  ]
}
```

### Pre-Review Checklist
- [ ] All permissions have clear justifications
- [ ] Test subreddit is clean and ready for demo
- [ ] Demo accounts have appropriate karma/age
- [ ] Sample challenges trigger all major features
- [ ] Error states are handled gracefully
- [ ] Mobile responsiveness verified on multiple devices
- [ ] Accessibility features tested with screen reader
- [ ] Privacy policy and terms of service completed
- [ ] Data handling documentation is accurate
- [ ] Performance benchmarks meet Reddit standards

---

## 🔒 Data Retention & Privacy

### Data Collection Policy
```typescript
interface DataCollected {
  required_data: {
    reddit_username: 'Public Reddit username (already public)';
    submission_images: 'Images uploaded for challenges (via Reddit hosting)';
    vote_records: 'User votes on submissions (anonymous aggregation)';
    points_earned: 'Game points and achievements';
    challenge_participation: 'Which challenges user joined';
  };
  
  not_collected: {
    personal_info: 'No email, real name, or personal details';
    private_messages: 'No access to Reddit DMs or chat';
    browsing_history: 'No tracking outside of PicTact';
    device_info: 'No device fingerprinting or tracking';
    location_data: 'No geolocation unless explicitly required for challenge';
  };
}
```

### Retention Windows
```typescript
const RETENTION_POLICY = {
  active_challenges: '30 days after completion',
  user_submissions: '90 days (images hosted by Reddit)',
  vote_records: '1 year for dispute resolution',
  points_leaderboards: 'Permanent (anonymous after 2 years)',
  moderator_decisions: '2 years for audit trail',
  error_logs: '30 days for debugging',
  analytics_data: '90 days aggregated only'
};

// Automatic Cleanup
class DataRetentionManager {
  async runDailyCleanup() {
    const now = Date.now();
    
    // Clean completed challenges older than 30 days
    const oldChallenges = await redis.keys('challenges:completed:*');
    for (const key of oldChallenges) {
      const challenge = await redis.get(key);
      if (challenge.completed_at < (now - 30 * 24 * 60 * 60 * 1000)) {
        await redis.del(key);
      }
    }
    
    // Clean old error logs
    await redis.del(`errors:${this.getDateString(now - 30 * 24 * 60 * 60 * 1000)}`);
  }
}
```

### User Data Control
```typescript
// GDPR/Privacy Compliance
interface UserDataRights {
  data_export: () => Promise<UserDataExport>;
  data_deletion: () => Promise<DeletionConfirmation>;
  data_portability: () => Promise<PortableData>;
}

class UserPrivacyManager {
  async exportUserData(userId: string): Promise<UserDataExport> {
    return {
      profile: await this.getUserProfile(userId),
      submissions: await this.getUserSubmissions(userId),
      votes: await this.getUserVotes(userId), // Anonymous
      achievements: await this.getUserAchievements(userId),
      points_history: await this.getPointsHistory(userId)
    };
  }
  
  async deleteUserData(userId: string): Promise<void> {
    // Anonymize rather than delete to preserve game integrity
    await this.anonymizeUser(userId);
    await this.removePersonalIdentifiers(userId);
    // Keep aggregated stats for leaderboards
  }
}
```

---

## 🚨 Incident & Rollback Plan

### Emergency Procedures
```typescript
interface EmergencyProcedures {
  freeze_all_games: {
    trigger: 'Critical bug affects game fairness';
    action: 'Pause all active challenges, notify users';
    timeline: 'Immediate - automated trigger available';
  };
  
  rollback_deployment: {
    trigger: 'New version causes system instability';
    action: 'Revert to previous stable version';
    timeline: '5 minutes via automated rollback';
  };
  
  data_corruption: {
    trigger: 'Redis data integrity issues detected';
    action: 'Switch to backup Redis instance';
    timeline: '2 minutes manual failover';
  };
  
  moderator_emergency: {
    trigger: 'Moderator abuse or community crisis';
    action: 'Remove moderator access, alert Reddit admins';
    timeline: 'Immediate via admin override';
  };
}
```

### Rollback Implementation
```typescript
class EmergencyManager {
  async freezeAllGames(reason: string) {
    // Set global freeze flag
    await redis.set('system:emergency_freeze', {
      active: true,
      reason: reason,
      timestamp: Date.now(),
      operator: 'system'
    });
    
    // Notify all moderators
    await this.notifyAllModerators('EMERGENCY_FREEZE', reason);
    
    // Display maintenance message to all users
    await this.broadcastMessage('System temporarily paused for maintenance');
  }
  
  async rollbackToVersion(version: string) {
    // Backup current state
    const backupId = await this.createEmergencyBackup();
    
    // Restore previous version data
    await this.restoreFromVersion(version);
    
    // Update system version
    await redis.set('system:version', version);
    
    // Log rollback event
    await this.logEmergencyAction('ROLLBACK', { 
      from_version: 'current',
      to_version: version,
      backup_id: backupId
    });
  }
}
```

### Communication Templates
```typescript
const EMERGENCY_TEMPLATES = {
  system_freeze: "⚠️ PicTact temporarily paused due to technical issues. Active challenges will resume shortly. Thank you for your patience.",
  
  rollback_notice: "🔧 PicTact has been rolled back to a previous version to resolve issues. Some recent activity may need to be restored.",
  
  data_issue: "📊 We're investigating potential data inconsistencies. No action needed from users. Updates will be posted here.",
  
  moderator_issue: "👮 Moderator permissions have been temporarily adjusted while we investigate reports. Normal operation will resume soon."
};
```

---

## ⚖️ Legal & Policy

### Content Policy Compliance
```typescript
interface ContentPolicyRules {
  reddit_content_policy: {
    enforcement: 'All submissions must comply with Reddit Content Policy';
    action: 'Automatic removal and user notification for violations';
    examples: 'No harassment, illegal content, personal information';
  };
  
  subreddit_rules: {
    enforcement: 'Respect all subreddit-specific rules and guidelines';
    action: 'Moderator discretion for rule violations';
    examples: 'NSFW restrictions, topic relevance, community standards';
  };
  
  fair_use_guidelines: {
    enforcement: 'Product images generally protected under fair use for reference';
    action: 'Remove if copyright holder requests via DMCA';
    examples: 'Game box art, album covers, product photos for identification';
  };
}
```

### Legal Disclaimers
```html
<!-- UI Footer Legal Text -->
<div class="legal-disclaimer">
  <p>Submitted images must comply with Reddit Content Policy and subreddit rules. 
     Product images are used for identification purposes under fair use guidelines. 
     Moderators may disqualify submissions at their discretion. 
     PicTact is not affiliated with Reddit Inc.</p>
</div>
```

### Terms of Service (Key Points)
```markdown
## PicTact Terms of Service Summary

### User Responsibilities
- Submit only content you have rights to share
- Follow all Reddit and subreddit rules
- Accept moderator decisions as final
- No cheating, coordination, or manipulation

### Data Usage
- Usernames and submissions are public via Reddit
- Game statistics may be displayed publicly
- No personal data collected beyond Reddit username
- Users can request data deletion at any time

### Limitation of Liability
- Game results are for entertainment only
- No monetary value for points or achievements
- Service provided "as is" without warranties
- Not responsible for Reddit platform issues

### Dispute Resolution
- Appeal incorrect decisions to moderators
- Final appeals may be reviewed by Reddit admins
- No guarantee of overturned decisions
- Community consensus generally respected
```

---

## 🔌 API Documentation

### Authentication
All API endpoints require Reddit authentication via Devvit context.

### Base URL
All API endpoints are prefixed with `/api/v1/`

### Challenge Endpoints

#### `POST /api/v1/challenges`
Create a new challenge (Moderators only)
```typescript
Request Body: {
  title: string;
  description: string;
  prompt: string;
  duration: number; // minutes
  maxParticipants?: number;
  allowedUsers?: string[];
  customTrophy?: string;
  pointsReward: number;
  category: string;
  rules: string[];
}

Response: {
  success: boolean;
  challengeId: string;
  message: string;
}
```

#### `GET /api/v1/challenges/active`
Get all active challenges in subreddit
```typescript
Response: {
  challenges: Challenge[];
  total: number;
}
```

#### `GET /api/v1/challenges/{challengeId}`
Get specific challenge details
```typescript
Response: {
  challenge: Challenge;
  submissions: Submission[];
  userSubmission?: Submission;
  canVote: boolean;
  votingEndsAt?: Date;
}
```

#### `POST /api/v1/challenges/{challengeId}/join`
Join a challenge
```typescript
Response: {
  success: boolean;
  message: string;
}
```

### Submission Endpoints

#### `POST /api/v1/challenges/{challengeId}/submit`
Submit an image for a challenge
```typescript
Request: FormData with image file and optional description

Response: {
  success: boolean;
  submissionId: string;
  message: string;
}
```

#### `GET /api/v1/submissions/{submissionId}`
Get submission details
```typescript
Response: {
  submission: Submission;
  votes: {
    total: number;
    approve: number;
    reject: number;
    userVote?: 'approve' | 'reject';
  };
}
```

### Voting Endpoints

#### `POST /api/v1/submissions/{submissionId}/vote`
Vote on a submission
```typescript
Request Body: {
  voteType: 'approve' | 'reject';
}

Response: {
  success: boolean;
  newVoteCount: number;
  message: string;
}
```

### User Endpoints

#### `GET /api/v1/users/profile`
Get current user's profile
```typescript
Response: {
  profile: UserProfile;
  recentActivity: Activity[];
}
```

#### `GET /api/v1/users/{userId}/profile`
Get public user profile
```typescript
Response: {
  profile: PublicUserProfile;
  achievements: Achievement[];
  trophies: Trophy[];
}
```

### Leaderboard Endpoints

#### `GET /api/v1/leaderboards/global`
Get global leaderboard
```typescript
Query Parameters: {
  period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  limit?: number;
  offset?: number;
}

Response: {
  rankings: UserRanking[];
  total: number;
  userRank?: number;
}
```

#### `GET /api/v1/leaderboards/subreddit`
Get subreddit-specific leaderboard
```typescript
Response: {
  rankings: UserRanking[];
  subreddit: string;
  userRank?: number;
}
```

### Moderator Endpoints

#### `POST /api/v1/moderator/validate/{submissionId}`
Validate a submission (Moderators only)
```typescript
Request Body: {
  decision: 'approve' | 'reject';
  reason?: string;
  overrideCommunity?: boolean;
}

Response: {
  success: boolean;
  winner?: string;
  pointsAwarded?: number;
  message: string;
}
```

#### `GET /api/v1/moderator/dashboard`
Get moderator dashboard data
```typescript
Response: {
  activeChallenges: Challenge[];
  pendingValidations: Submission[];
  stats: ModeratorStats;
  recentActivity: Activity[];
}
```

---

## 🎨 Frontend Components

### 1. Challenge Creator Component
```typescript
interface ChallengeCreatorProps {
  onChallengeCreated: (challenge: Challenge) => void;
  userCanCreate: boolean;
}

// Features:
- Rich text editor for descriptions
- Image upload for custom trophies
- Time picker for duration
- Participant limit controls
- Category selection
- Rules builder interface
- Preview mode before publishing
```

### 2. Game Interface Component
```typescript
interface GameInterfaceProps {
  challengeId: string;
  userRole: 'player' | 'moderator' | 'spectator';
}

// Features:
- Real-time countdown timer
- Live submission feed
- Voting interface during voting phase
- Winner announcement animations
- Progress indicators
- Mobile-responsive design
```

### 3. Submission Handler Component
```typescript
interface SubmissionHandlerProps {
  challengeId: string;
  onSubmissionSuccess: (submission: Submission) => void;
  maxFileSize: number;
}

// Features:
- Drag-and-drop image upload
- Image preview and cropping
- File validation (size, format)
- Progress indicator for upload
- Duplicate detection warning
- Description text input
```

### 4. Voting Interface Component
```typescript
interface VotingInterfaceProps {
  submissions: Submission[];
  onVote: (submissionId: string, voteType: string) => void;
  votingTimeLeft: number;
}

// Features:
- Grid layout of submissions
- Quick vote buttons (approve/reject)
- Real-time vote counts
- Visual feedback for user's votes
- Timer display for voting deadline
- Submission details modal
```

### 5. Leaderboard Component
```typescript
interface LeaderboardProps {
  scope: 'global' | 'subreddit' | 'category';
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  limit: number;
}

// Features:
- Animated ranking changes
- User avatar integration
- Points and trophy display
- Filter and sort options
- Pagination for large lists
- Highlight current user position
```

---

## 🎯 Game Flow & Logic

### Challenge Lifecycle

#### 1. Creation Phase
```
Moderator creates challenge → Validation → Redis storage → Notification → Display
```

#### 2. Active Phase
```
Timer starts → Players submit images → Real-time updates → Duplicate detection
```

#### 3. Voting Phase
```
Submission deadline → Community voting begins → Real-time vote aggregation → Moderator review
```

#### 4. Validation Phase
```
Moderator decision → Winner selection → Points calculation → Trophy award → Notifications
```

#### 5. Completion Phase
```
Results published → Leaderboard updates → Achievement checks → Challenge archive
```

### Real-Time Event Handling
```typescript
// WebSocket Events
interface GameEvents {
  'challenge_created': Challenge;
  'challenge_started': { challengeId: string };
  'submission_added': Submission;
  'voting_started': { challengeId: string, duration: number };
  'vote_cast': { submissionId: string, voteCount: number };
  'challenge_completed': { challengeId: string, winner: string };
  'points_awarded': { userId: string, points: number };
  'achievement_unlocked': { userId: string, achievement: Achievement };
}

// Event Flow
1. User action triggers frontend event
2. Frontend sends WebSocket message
3. Backend processes and updates Redis
4. Backend broadcasts update to all connected clients
5. Frontend updates UI in real-time
```

### Anti-Cheat Measures
```typescript
// Image Validation
- Hash-based duplicate detection
- Reverse image search integration
- File metadata analysis
- Upload time validation
- User behavior pattern analysis

// Vote Validation
- One vote per user per submission
- Vote weight based on user reputation
- Rapid voting detection
- IP-based fraud detection
- Moderator override capabilities
```

---

## 👥 User Roles & Permissions

### Player Role
**Permissions:**
- Join public challenges
- Submit images to active challenges
- Vote on submissions during voting phase
- View leaderboards and user profiles
- Earn points and achievements
- Customize profile settings

**Restrictions:**
- Cannot create challenges
- Cannot validate submissions
- Cannot access moderator dashboard
- Cannot modify challenge settings

### Moderator Role
**Permissions:**
- All player permissions
- Create and manage challenges
- Validate submissions and override community votes
- Access moderator dashboard and analytics
- Customize challenge settings and trophies
- Manage subreddit-specific game rules
- Ban users from participating

**Responsibilities:**
- Ensure fair play and rule enforcement
- Validate submissions accurately
- Create engaging challenges
- Maintain community standards
- Handle disputes and appeals

### Admin Role (Future)
**Permissions:**
- All moderator permissions
- Global system configuration
- Cross-subreddit management
- Advanced analytics access
- User account management
- System maintenance tools

---

## 🏆 Points & Rewards System

### Point Categories
```typescript
enum PointTypes {
  PARTICIPATION = 10,      // Joining a challenge
  SUBMISSION = 25,         // Submitting a valid image
  COMMUNITY_VOTE = 5,      // Receiving community votes
  WINNING = 100,           // Winning a challenge
  STREAK_BONUS = 50,       // Consecutive wins
  MODERATOR_HOST = 75,     // Hosting successful challenge
  ACHIEVEMENT = 200,       // Unlocking achievements
  PERFECT_SCORE = 150,     // 100% community approval
  SPEED_BONUS = 30,        // Fast submission
  ACCURACY_BONUS = 40,     // High approval rating
}
```

### Achievement System
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: AchievementRequirement[];
  unlockMessage: string;
}

// Example Achievements
const achievements: Achievement[] = [
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first challenge',
    rarity: 'common',
    points: 100
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Submit winning image in under 30 seconds',
    rarity: 'rare',
    points: 250
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Achieve 100% community approval 5 times',
    rarity: 'epic',
    points: 500
  },
  {
    id: 'legendary_hunter',
    name: 'Legendary Hunter',
    description: 'Win 100 challenges',
    rarity: 'legendary',
    points: 1000
  }
];
```

### Trophy System
```typescript
interface Trophy {
  id: string;
  challengeId: string;
  name: string;
  description: string;
  imageUrl: string;
  awardedTo: string;
  awardedAt: Date;
  category: string;
  isCustom: boolean;
  moderatorId?: string;
}

// Default Trophy Categories
- Speed Master: Fastest submission
- Community Choice: Most voted submission
- Moderator's Pick: Moderator selected winner
- Perfect Find: Exact match to requirements
- Rare Hunter: Finding difficult items
```

---

## ✅ Validation & Voting System

### Community Voting Mechanics
```typescript
interface VotingSession {
  challengeId: string;
  startTime: Date;
  endTime: Date;
  submissions: string[]; // submissionIds
  votes: Map<string, Vote[]>; // submissionId -> votes
  status: 'active' | 'completed' | 'cancelled';
}

// Voting Algorithm
1. Each user can vote once per submission
2. Votes weighted by user reputation (1.0 - 2.0 multiplier)
3. Real-time vote aggregation
4. Threshold system for clear community consensus
5. Tie-breaking by submission time
```

### Moderator Override System
```typescript
interface ModeratorDecision {
  submissionId: string;
  decision: 'approve' | 'reject';
  overrideReason?: string;
  communityVotes: VoteSummary;
  finalWinner: string;
  pointsAwarded: number;
  timestamp: Date;
}

// Override Conditions
- Community vote is unclear (< 60% consensus)
- Technical accuracy requires expert knowledge
- Submission violates unstated rules
- Tie-breaking between equal submissions
- Appeal from participant with valid concern
```

### Validation Workflow
```typescript
// Phase 1: Automatic Validation
- File format and size check
- Duplicate image detection
- Basic content analysis
- Metadata verification

// Phase 2: Community Voting
- 60-second voting window
- Real-time vote aggregation
- Visual feedback on vote counts
- Early termination if clear consensus

// Phase 3: Moderator Review
- Review community sentiment
- Apply expert knowledge
- Make final decision with reasoning
- Award points and trophy
```

---

## 🚀 Deployment Guide

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Redis data migrations completed
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Backup and rollback plan ready

### Build Process
```bash
# 1. Run comprehensive tests
npm run test
npm run test:integration
npm run test:e2e

# 2. Type checking
npm run type-check

# 3. Build optimized bundles
npm run build

# 4. Validate build
npm run validate-build

# 5. Pre-deployment tests
npm run test:production
```

### Deployment Commands
```bash
# Development Deployment
npm run deploy:dev

# Staging Deployment
npm run deploy:staging

# Production Deployment
npm run deploy:production

# Rollback (if needed)
npm run rollback
```

### Post-Deployment Verification
```bash
# Health Check Endpoints
GET /api/health
GET /api/v1/status
GET /api/v1/metrics

# Smoke Tests
npm run smoke-tests

# Performance Monitoring
npm run perf-check
```

### Environment-Specific Configurations

#### Development
```javascript
// devvit.json (development)
{
  "dev": {
    "subreddit": "pictact_dev",
    "logLevel": "debug",
    "enableHotReload": true,
    "mockData": true
  }
}
```

#### Production
```javascript
// devvit.json (production)
{
  "dev": {
    "subreddit": "pictact_production",
    "logLevel": "info",
    "enableAnalytics": true,
    "rateLimit": true
  }
}
```

### Monitoring & Alerts
- **Error Tracking**: Integration with error reporting service
- **Performance Monitoring**: Response time and throughput metrics
- **User Analytics**: Engagement and retention metrics
- **System Health**: Redis memory usage, API response times
- **Alert Thresholds**: Error rates, response times, user complaints

---

## 🧪 Testing Strategy

### Testing Pyramid
```
E2E Tests (10%)           - Full user journeys
Integration Tests (20%)   - API and database interactions
Unit Tests (70%)         - Individual functions and components
```

### Unit Testing
```typescript
// Example: Challenge Service Tests
describe('ChallengeService', () => {
  describe('createChallenge', () => {
    it('should create challenge with valid data', async () => {
      // Test implementation
    });
    
    it('should reject challenge with invalid data', async () => {
      // Test implementation
    });
    
    it('should enforce moderator permissions', async () => {
      // Test implementation
    });
  });
});
```

### Integration Testing
```typescript
// Example: API Integration Tests
describe('Challenge API', () => {
  it('should create, update, and delete challenge', async () => {
    // Full CRUD workflow test
  });
  
  it('should handle real-time updates correctly', async () => {
    // WebSocket integration test
  });
});
```

### End-to-End Testing
```typescript
// Example: Game Flow E2E Test
describe('Complete Game Flow', () => {
  it('should complete full challenge lifecycle', async () => {
    // 1. Moderator creates challenge
    // 2. Players join and submit
    // 3. Community voting occurs
    // 4. Moderator validates winner
    // 5. Points awarded correctly
    // 6. Leaderboard updates
  });
});
```

### Performance Testing
- **Load Testing**: Simulate high concurrent user activity
- **Stress Testing**: Find system breaking points
- **Spike Testing**: Handle sudden traffic increases
- **Endurance Testing**: Long-running stability tests

### Test Data Management
```typescript
// Test Fixtures
const testChallenge: Challenge = {
  id: 'test-challenge-1',
  title: 'Test Gaming Challenge',
  // ... other properties
};

const testSubmissions: Submission[] = [
  // ... test submissions
];

// Database Seeding
beforeEach(async () => {
  await seedTestData();
});

afterEach(async () => {
  await cleanupTestData();
});
```

---

## ⚡ Performance Optimization

### Frontend Optimization
```typescript
// Code Splitting
const ChallengeCreator = lazy(() => import('./components/ChallengeCreator'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));

// Image Optimization
- Lazy loading for submission images
- Progressive image loading
- Image compression and resizing
- CDN integration for static assets

// Bundle Optimization
- Tree shaking unused code
- Minification and compression
- Modern JavaScript for supported browsers
- Service worker for offline functionality
```

### Backend Optimization
```typescript
// Database Optimization
- Redis connection pooling
- Efficient key structure design
- Data denormalization for read performance
- Batch operations for bulk updates
- TTL settings for temporary data

// API Optimization
- Response compression (gzip)
- Caching strategies (Redis, memory)
- Rate limiting to prevent abuse
- Async processing for heavy operations
- Database query optimization
```

### Real-Time Performance
```typescript
// WebSocket Optimization
- Connection pooling and management
- Message batching for high frequency updates
- Client-side event throttling
- Heartbeat mechanism for connection health
- Graceful fallback to HTTP polling

// Memory Management
- Automatic cleanup of completed games
- Efficient data structures
- Memory leak detection and prevention
- Garbage collection optimization
```

### Caching Strategy
```typescript
// Multi-Level Caching
1. Browser Cache: Static assets (images, CSS, JS)
2. CDN Cache: Global asset distribution
3. Application Cache: Frequently accessed data
4. Database Cache: Query result caching
5. Memory Cache: Real-time game state

// Cache Invalidation
- Time-based expiration (TTL)
- Event-based invalidation
- Manual cache busting for updates
- Cache warming for popular content
```

---

## 🔒 Security Considerations

### Input Validation & Sanitization
```typescript
// Frontend Validation
- File type and size validation
- Image content scanning
- Input sanitization for XSS prevention
- CSRF token validation
- Rate limiting on user actions

// Backend Validation
- Schema validation for all API inputs
- SQL injection prevention
- File upload security scanning
- User permission verification
- Request size limiting
```

### Authentication & Authorization
```typescript
// Reddit OAuth Integration
- Secure token handling
- Session management
- Permission-based access control
- Moderator privilege verification
- User identity verification

// API Security
- Request signing and verification
- Rate limiting per user
- IP-based restrictions
- Suspicious activity detection
- Automated security monitoring
```

### Data Protection
```typescript
// User Privacy
- Minimal data collection
- Data encryption at rest
- Secure data transmission (HTTPS)
- User data anonymization options
- GDPR compliance measures

// Image Security
- Malware scanning for uploaded images
- Content moderation for inappropriate images
- Image metadata scrubbing
- Secure file storage and access
- Digital watermarking for originals
```

### Content Moderation
```typescript
// Automated Moderation
- Image content analysis
- Text content filtering
- Spam detection algorithms
- Duplicate content identification
- Community reporting system

// Manual Moderation
- Moderator review queues
- Appeal and dispute resolution
- User behavior tracking
- Temporary and permanent bans
- Community guidelines enforcement
```

---

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### Build Issues
```bash
# Issue: TypeScript compilation errors
# Solution: Update types and fix syntax
npm run type-check
npm run lint --fix

# Issue: Vite build failures
# Solution: Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### Runtime Issues
```bash
# Issue: Redis connection failures
# Solution: Check Redis configuration
redis-cli ping
# Verify REDIS_URL in .env

# Issue: WebSocket connection problems
# Solution: Check firewall and proxy settings
# Verify WebSocket endpoint accessibility
```

#### Performance Issues
```bash
# Issue: Slow API responses
# Solution: Enable performance monitoring
npm run perf-profile

# Issue: High memory usage
# Solution: Monitor memory leaks
npm run memory-check
```

### Debug Mode
```typescript
// Enable debug logging
localStorage.setItem('pictact_debug', 'true');

// API debugging
const debugResponse = await fetch('/api/debug/state');
console.log(await debugResponse.json());

// WebSocket debugging
websocket.addEventListener('message', (event) => {
  console.log('WS Message:', event.data);
});
```

### Error Reporting
```typescript
// Client-side error tracking
window.addEventListener('error', (error) => {
  // Send error to monitoring service
  reportError(error);
});

// Server-side error logging
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  // Send to error tracking service
});
```

### Health Monitoring
```typescript
// System Health Endpoints
GET /api/health - Basic health check
GET /api/metrics - Performance metrics
GET /api/debug/redis - Redis connection status
GET /api/debug/memory - Memory usage statistics
```

---

## 🔮 Future Roadmap

### Phase 1: Core Platform (Current)
- [x] Basic challenge creation and submission
- [x] Community voting system
- [x] Points and leaderboards
- [x] Custom trophies
- [ ] Real-time notifications
- [ ] Mobile optimization

### Phase 2: Enhanced Features (Next 3 months)
- [ ] Advanced image analysis and validation
- [ ] Tournament and bracket systems
- [ ] Team-based challenges
- [ ] Cross-subreddit competitions
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations

### Phase 3: Community Growth (Months 4-6)
- [ ] Partnership with gaming communities
- [ ] Educational institution integrations
- [ ] Sponsored challenges and prizes
- [ ] Mobile application companion
- [ ] Advanced moderation tools
- [ ] Multi-language support

### Phase 4: Platform Expansion (Months 7-12)
- [ ] AI-powered challenge suggestions
- [ ] Augmented reality features
- [ ] Blockchain-based achievements
- [ ] Marketplace for custom trophies
- [ ] Professional esports integration
- [ ] Machine learning for fraud detection

### Long-term Vision
- Become the primary gaming platform for Reddit
- Integration with external gaming platforms
- Educational partnerships for gamified learning
- Corporate team building applications
- Virtual reality challenge experiences

---

## 📞 Support & Contact

### Development Team
- **Lead Developer**: [Your Name]
- **Email**: [your-email@domain.com]
- **GitHub**: [github.com/yourusername/pictact]

### Community
- **Subreddit**: r/pictact_dev
- **Discord**: [Discord Invite Link]
- **Documentation**: [docs.pictact.com]

### Reporting Issues
1. Check existing issues on GitHub
2. Provide detailed reproduction steps
3. Include system information and logs
4. Tag with appropriate labels

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Wait for code review

---

## 📄 License

This project is licensed under the BSD-3-Clause License. See the LICENSE file for details.

---

## 🙏 Acknowledgments

- Reddit Devvit team for the amazing platform
- Beta testers and early community members
- Open source contributors
- Gaming communities for inspiration and feedback

---

*Last Updated: September 10, 2025*
*Version: 1.0.0*

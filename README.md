# 🎯 PicTact - Real-Time Image Hunt Game

## 📋 **Project Overview**

PicTact is a competitive real-time photo hunting game where players compete to capture specific images based on moderator-created challenges. The first player to submit a correct photo wins points and advances on the leaderboard.

### **Core Game Mechanics**
- **Challenge System**: Mod-created events with limited questions
- **Competition Format**: First to submit correct photo wins points  
- **Validation Method**: Moderator validates all submissions
- **Reward System**: Points + collectible square image badges
- **Multiplayer Scope**: Global, friends, and location-based competitions
- **Difficulty**: Random challenge difficulty (no progression)
- **Time Format**: Time-limited challenges (5-10 minutes per challenge)

---

# 🚀 **PHASE 1: Core Game Interface**
*Duration: 2-3 weeks*
*Priority: Essential MVP Features*

## 📱 **Main Dashboard Layout**

### **Header Section** (Fixed Top - 60px height)
```
┌─────────────────────────────────────┐
│  🎯 PicTact    [👤Profile] [⚙️Menu] │
│  ────────────────────────────────── │
│  🏆 1,247 pts  ⚡ Level 8  🔥 3 day │
└─────────────────────────────────────┘
```

**Technical Specifications:**
- **Container**: Fixed position, z-index: 1000
- **Logo**: Inter Bold 20px, color: #FF6B35
- **Profile Avatar**: 32x32px circle, border: 2px solid #FF6B35
- **Points Display**: Live WebSocket updates, bounce animation on change
- **Level Badge**: Circular progress ring, SVG-based
- **Streak Counter**: Fire emoji + number, pulse animation

### **Active Challenge Card** (Center Focus - 280px height)
```
┌─────────────────────────────────────┐
│           🎪 CIRCUS EVENT           │
│     ────────────────────────────    │
│                                     │
│  📸 "Find a RED POSTER anywhere"    │
│                                     │
│      ⏱️ 04:23 remaining             │
│                                     │
│  👥 12 players hunting...           │
│                                     │
│    [🔥 CAPTURE NOW! 📷]            │
└─────────────────────────────────────┘
```

**Design Specifications:**
- **Card Background**: Linear gradient based on event theme
- **Border Radius**: 12px with subtle box-shadow
- **Challenge Text**: Inter Semi-Bold 18px, max 2 lines with ellipsis
- **Timer Display**: JetBrains Mono 16px, color transitions:
  - Green (#28A745): >3 minutes
  - Yellow (#FFC107): 1-3 minutes  
  - Red (#DC3545): <1 minute
- **Capture Button**: 
  - Size: 280px width × 60px height
  - Background: #FF6B35 with white text
  - Animation: Scale pulse (1.0 → 1.05 → 1.0) every 2 seconds
  - Border radius: 30px

### **Quick Stats Bar** (Below Challenge - 80px height)
```
┌─────────────────────────────────────┐
│  🥇 1st: Alex    🥈 2nd: Sarah      │
│  📊 You: 5th     🎯 3/10 completed  │
└─────────────────────────────────────┘
```

**Layout Details:**
- **Grid**: 2×2 layout with equal spacing
- **Font**: Inter Regular 14px
- **Colors**: Gold (#FFD700), Silver (#C0C0C0), Bronze (#CD7F32)
- **Updates**: Real-time via WebSocket connections

### **Recent Activity Feed** (Bottom Section - Scrollable)
```
┌─────────────────────────────────────┐
│ 📷 Mike found "Blue Car" - 1m ago   │
│ 🏆 Lisa won "Round Object" +50pts   │
│ 🎪 New event "City Hunt" started!   │
│ 📸 Sarah submitted for "Red Sign"   │
│ ⚡ Tom completed 5-win streak!       │
└─────────────────────────────────────┘
```

**Technical Implementation:**
- **Container**: Max height 200px, overflow-y: scroll
- **Items**: Fade in from top, slide out to bottom after 10 items
- **Timestamps**: Relative time updates (1m ago, 2h ago, etc.)
- **Auto-refresh**: Every 30 seconds

## 🎨 **Visual Design System**

### **Color Palette**
```css
:root {
  /* Primary Colors */
  --primary-orange: #FF6B35;
  --primary-orange-light: #FF8A65;
  --primary-orange-dark: #E5511E;
  
  /* Status Colors */
  --success-green: #28A745;
  --warning-yellow: #FFC107;
  --danger-red: #DC3545;
  --info-blue: #17A2B8;
  
  /* Neutral Colors */
  --background-primary: #F8F9FA;
  --background-secondary: #FFFFFF;
  --text-primary: #212529;
  --text-secondary: #6C757D;
  --border-light: #DEE2E6;
  --border-dark: #ADB5BD;
}
```

### **Typography System**
```css
/* Headers */
.heading-xl { font: Bold 24px/1.2 'Inter'; }
.heading-lg { font: Bold 20px/1.3 'Inter'; }
.heading-md { font: Semi-Bold 18px/1.4 'Inter'; }

/* Body Text */
.body-lg { font: Regular 16px/1.5 'Inter'; }
.body-md { font: Regular 14px/1.5 'Inter'; }
.body-sm { font: Regular 12px/1.4 'Inter'; }

/* Special */
.timer-text { font: Regular 16px/1.2 'JetBrains Mono'; }
.button-text { font: Semi-Bold 16px/1.2 'Inter'; }
```

### **Component Specifications**

#### **Primary Button**
```css
.btn-primary {
  background: linear-gradient(135deg, #FF6B35 0%, #E5511E 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font: Semi-Bold 16px 'Inter';
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(229, 81, 30, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(229, 81, 30, 0.2);
}
```

#### **Challenge Card**
```css
.challenge-card {
  background: linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%);
  border-radius: 12px;
  padding: 24px;
  color: white;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.2);
  transition: transform 0.3s ease;
}

.challenge-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 107, 53, 0.3);
}
```

### **Animation Library**

#### **1. Card Flip (New Challenge Reveal)**
```css
@keyframes cardFlip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(-90deg); }
  100% { transform: rotateY(0deg); }
}

.challenge-card.new-challenge {
  animation: cardFlip 0.8s ease-in-out;
}
```

#### **2. Button Pulse (Capture Button)**
```css
@keyframes buttonPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.btn-capture {
  animation: buttonPulse 2s infinite;
}
```

#### **3. Timer Color Transition**
```css
.timer {
  transition: color 0.5s ease;
}

.timer.warning { color: #FFC107; }
.timer.danger { 
  color: #DC3545;
  animation: timerPulse 1s infinite;
}

@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

#### **4. Points Counter Animation**
```css
@keyframes pointsBounce {
  0% { transform: translateY(0); }
  25% { transform: translateY(-8px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}

.points-counter.updated {
  animation: pointsBounce 0.6s ease;
}
```

#### **5. Loading Skeleton**
```css
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

---

# 🔥 **PHASE 2: Camera & Submission Flow**
*Duration: 2-3 weeks*
*Priority: Core Functionality*

## 📸 **Camera Interface Layout**

### **Camera Header** (Fixed Top - 60px)
```
┌─────────────────────────────────────┐
│  ←  📸 "Find RED POSTER"  ⏱️ 03:45  │
└─────────────────────────────────────┘
```

**Technical Specifications:**
- **Back Button**: 44x44px touch target, chevron-left icon
- **Challenge Text**: Truncated with ellipsis if too long
- **Timer**: Live countdown, same color logic as dashboard
- **Background**: Rgba(0,0,0,0.7) overlay for readability

### **Camera Viewfinder** (Full Screen)
```
┌─────────────────────────────────────┐
│                                     │
│       [LIVE CAMERA PREVIEW]         │
│                                     │
│     Grid lines (optional)           │
│                                     │
│     Focus indicator (tap-to-focus)  │
│                                     │
└─────────────────────────────────────┘
```

**Camera Features:**
- **Aspect Ratio**: 16:9 default, switchable to 4:3, 1:1
- **Grid Lines**: Rule of thirds overlay (toggle-able)
- **Focus Ring**: Animated circle on tap-to-focus
- **Exposure Control**: Slide up/down for brightness
- **Pinch to Zoom**: Smooth scaling with limits

### **Camera Controls** (Bottom - 100px)
```
┌─────────────────────────────────────┐
│  [📁 Gallery] [⚪ CAPTURE] [🔄 Flip] │
└─────────────────────────────────────┘
```

**Control Specifications:**
- **Gallery Button**: 44x44px, shows last photo thumbnail
- **Capture Button**: 70x70px white circle, red dot center when recording
- **Flip Button**: 44x44px, camera rotation icon
- **Layout**: Flex with space-between alignment
- **Background**: Semi-transparent black bar

## 📷 **Photo Preview & Submission Flow**

### **Preview Screen Layout**
```
┌─────────────────────────────────────┐
│  ← Back          Review Photo       │
│  ────────────────────────────────── │
│                                     │
│        [CAPTURED IMAGE PREVIEW]     │
│                                     │
│  Challenge: "Find RED POSTER"       │
│  📏 Image: 1080x1920, 2.3MB        │
│                                     │
│  [❌ Retake]  [✅ Submit Entry]     │
└─────────────────────────────────────┘
```

**Preview Features:**
- **Image Display**: Full width, maintain aspect ratio
- **Zoom Capability**: Pinch to zoom up to 3x
- **Image Info**: Resolution, file size, timestamp
- **Challenge Reminder**: Highlighted challenge text
- **Action Buttons**: Equal width, contrasting colors

### **Submission Process States**

#### **Step 1: Confirmation Dialog**
```
┌─────────────────────────────────────┐
│         Confirm Submission          │
│                                     │
│  Submit this photo for:             │
│  "Find RED POSTER"                  │
│                                     │
│  ⚠️ Once submitted, you cannot      │
│     change your entry!              │
│                                     │
│  [Cancel] [✅ Submit & Compete]     │
└─────────────────────────────────────┘
```

#### **Step 2: Upload Progress**
```
┌─────────────────────────────────────┐
│         Submitting Entry...         │
│                                     │
│  📤 Uploading photo... 67%          │
│  ████████████▒▒▒▒▒▒                │
│                                     │
│  🔄 Processing submission...        │
│                                     │
│  ⏱️ Est. time remaining: 8 seconds  │
└─────────────────────────────────────┘
```

#### **Step 3: Submission Success**
```
┌─────────────────────────────────────┐
│              🎉 SUBMITTED!          │
│                                     │
│  Your photo is being reviewed...    │
│                                     │
│  ⏱️ Results in ~2-5 minutes         │
│                                     │
│  🎯 +10 points for participation    │
│                                     │
│    [🏠 Back to Game] [📊 Stats]     │
└─────────────────────────────────────┘
```

## 🏆 **Result & Outcome Screens**

### **Victory Screen (First Place)**
```
┌─────────────────────────────────────┐
│         🥇 YOU WON! 🥇              │
│                                     │
│  Challenge: "Find RED POSTER"       │
│  ⏱️ Completed in: 2:34              │
│                                     │
│      🎯 +100 POINTS EARNED!         │
│      🏆 +1 WIN STREAK               │
│      📸 [Your winning photo]        │
│                                     │
│  🎊 Bonus: +25 pts (Speed Bonus)    │
│                                     │
│    [📤 Share] [🎪 Next Challenge]   │
└─────────────────────────────────────┘
```

### **Runner-up Screen (2nd/3rd Place)**
```
┌─────────────────────────────────────┐
│         🥈 2ND PLACE! 🥈            │
│                                     │
│  Challenge: "Find RED POSTER"       │
│  ⏱️ Completed in: 3:12              │
│                                     │
│      🎯 +50 POINTS EARNED!          │
│      📸 [Your submission]           │
│                                     │
│  🥇 Winner: Alex_Photo (2:34)       │
│                                     │
│    [👀 View Winner] [🎪 Next]       │
└─────────────────────────────────────┘
```

### **Participation Screen (No Win)**
```
┌─────────────────────────────────────┐
│        Thanks for Playing! 📸       │
│                                     │
│  Challenge: "Find RED POSTER"       │
│  ⏱️ Submitted in: 4:45              │
│                                     │
│      🎯 +10 POINTS (Participation)  │
│      📸 [Your submission]           │
│                                     │
│  🥇 Winner: Alex_Photo (2:34)       │
│  🥈 2nd: Sarah_Snap (3:12)          │
│                                     │
│    [👀 View Results] [🎪 Next]      │
└─────────────────────────────────────┘
```

### **Challenge Complete Overview**
```
┌─────────────────────────────────────┐
│        Challenge Complete! 🎪       │
│                                     │
│  📸 "Find RED POSTER"               │
│  👥 23 players participated         │
│  ⏱️ Completed in 4:45               │
│                                     │
│  🏆 FINAL RESULTS:                  │
│  🥇 Alex_Photo (+100pts) 2:34       │
│  🥈 Sarah_Snap (+50pts) 3:12        │
│  🥉 Mike_Cam (+25pts) 3:58          │
│  4th You (+10pts) 4:45              │
│                                     │
│  📸 [View All Submissions]          │
│                                     │
│    [🏠 Home] [🎯 Next Challenge]    │
└─────────────────────────────────────┘
```

## 🎬 **Advanced Animations Phase 2**

### **Camera Transitions**
```css
/* Slide in from right */
@keyframes slideInCamera {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

/* Photo capture flash */
@keyframes cameraFlash {
  0% { background-color: rgba(255,255,255,0); }
  50% { background-color: rgba(255,255,255,0.9); }
  100% { background-color: rgba(255,255,255,0); }
}

/* Focus ring animation */
@keyframes focusRing {
  0% { transform: scale(1.5); opacity: 0; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}
```

### **Result Animations**
```css
/* Victory confetti */
@keyframes confetti {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
}

/* Points counter fly-up */
@keyframes pointsFlyUp {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
}

/* Medal bounce */
@keyframes medalBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
```

---

# 🎪 **PHASE 3: Events & Competition System**
*Duration: 2-3 weeks*  
*Priority: Social & Competitive Features*

## 🏟️ **Event Management Interface**

### **Events Dashboard Layout**
```
┌─────────────────────────────────────┐
│  🎪 EVENTS  [🔍] [📅] [⚙️Settings]  │
│  ────────────────────────────────── │
│                                     │
│  🔥 ACTIVE NOW (2)                  │
│                                     │
│  🏙️ City Hunt Challenge             │
│  ⏱️ 2h 15m left  👥 24 players      │
│  🎯 5/12 questions remaining        │
│  🏆 Prize: 1,200 pts total          │
│  [📸 Join Now] [👁️ Watch]          │
│  ────────────────────────────────── │
│                                     │
│  🌟 Weekend Photo Battle            │
│  ⏱️ 1d 3h left  👥 156 players      │
│  🎯 8/15 questions remaining        │
│  🏆 Prize: 5,000 pts total          │
│  [📸 Join Now] [👁️ Watch]          │
│  ────────────────────────────────── │
│                                     │
│  📅 STARTING SOON (1)               │
│                                     │
│  🎨 Art Hunt Extravaganza           │
│  🕐 Starts in: 3h 24m               │
│  👤 Created by: Mod_ArtLover        │
│  🎯 15 artistic challenges          │
│  [🔔 Remind Me] [ℹ️ Details]        │
└─────────────────────────────────────┘
```

### **Event Detail Screen**
```
┌─────────────────────────────────────┐
│  ← Back    🎪 City Hunt Challenge   │
│  ────────────────────────────────── │
│                                     │
│  📅 Created by: Mod_Sarah           │
│  🕐 Started: 2h 15m ago             │
│  ⏱️ Time Left: 2h 15m               │
│  🎯 Total Questions: 12             │
│  💰 Prize Pool: 1,200 points        │
│  👥 Participants: 24 players        │
│                                     │
│  📋 EVENT PROGRESS:                 │
│  ✅ Q1: "Red Car" (Alex won)        │
│  ✅ Q2: "Blue Sign" (Sarah won)     │
│  ✅ Q3: "Round Object" (Mike won)   │
│  ✅ Q4: "Green Plant" (Lisa won)    │
│  ✅ Q5: "Metal Door" (Tom won)      │
│  ✅ Q6: "Food Item" (Emma won)      │
│  ✅ Q7: "Pet Animal" (Jake won)     │
│  🔥 Q8: "RED POSTER" (ACTIVE)       │
│  ⏳ Q9-Q12: Coming soon...          │
│                                     │
│  🏅 CURRENT STANDINGS:              │
│  🥇 Alex_Photo: 450 pts (3 wins)    │
│  🥈 Sarah_Snap: 420 pts (2 wins)    │
│  🥉 Mike_Cam: 380 pts (1 win)       │
│  4th You: 350 pts (1 win)           │
│  5th Lisa_Lens: 300 pts (1 win)     │
│                                     │
│    [📸 Current Challenge]           │
│    [📊 Full Leaderboard]           │
│    [🔔 Notifications: ON]          │
└─────────────────────────────────────┘
```

## 👑 **Leaderboard & Ranking Systems**

### **Global Leaderboard**
```
┌─────────────────────────────────────┐
│  🌍 Global Rankings                 │
│  [🏆 All Time] [📅 Monthly] [📊 Weekly]│
│  ────────────────────────────────── │
│                                     │
│  🥇 #1  PhotoKing     🎯 15,847     │
│      Level 15 • 127 wins • 89% WR   │
│  🥈 #2  SnapQueen     🎯 14,923     │
│      Level 14 • 119 wins • 85% WR   │
│  🥉 #3  CamMaster     🎯 13,645     │
│      Level 13 • 105 wins • 82% WR   │
│  4   #4  ShutterPro   🎯 12,891     │
│      Level 12 • 98 wins • 79% WR    │
│  5   #5  LensLegend   🎯 12,456     │
│      Level 12 • 94 wins • 76% WR    │
│  ────────────────────────────────── │
│  📈 #247 YOU          🎯 1,247      │
│      Level 8 • 12 wins • 45% WR     │
│  ────────────────────────────────── │
│                                     │
│  [📍 Local Rankings] [👥 Friends]   │
│  [🎪 Event Rankings] [📊 My Stats]  │
└─────────────────────────────────────┘
```

### **Weekly Challenge Calendar**
```
┌─────────────────────────────────────┐
│  📅 This Week's Daily Challenges    │
│  Week of Sept 13-19, 2025          │
│  ────────────────────────────────── │
│                                     │
│  ✅ MON 13: Street Art              │
│      🎯 +50 pts • 🥇 Sarah_Snap     │
│                                     │
│  ✅ TUE 14: Blue Object             │
│      🎯 +75 pts • 🥇 Mike_Cam       │
│                                     │
│  🔥 WED 15: Red Poster              │
│      ⏱️ 3:45 left • 👥 12 hunting   │
│      [📸 JOIN NOW]                  │
│                                     │
│  ⏳ THU 16: Round Thing             │
│      🔒 Unlocks in 18h 23m          │
│                                     │
│  ⏳ FRI 17: Green Plant             │
│      🔒 Unlocks in 42h 23m          │
│                                     │
│  ⏳ SAT 18: Metal Sign              │
│      🔒 Unlocks in 66h 23m          │
│                                     │
│  ⏳ SUN 19: MEGA BONUS Quest        │
│      🔒 Complete all 6 to unlock    │
│      🏆 TRIPLE POINTS REWARD!       │
│                                     │
│  📊 Your Progress: 2/7 completed    │
│  🎯 Potential Points: 500 total     │
└─────────────────────────────────────┘
```

### **Friends & Social Features**
```
┌─────────────────────────────────────┐
│  👥 Friends & Social                │
│  ────────────────────────────────── │
│                                     │
│  🔍 [Search for friends...]         │
│                                     │
│  🟢 ONLINE FRIENDS (3/12)           │
│                                     │
│  📸 Alex_Photo (Level 12)           │
│      Currently in: City Hunt        │
│      [💬 Challenge] [📊 Compare]    │
│                                     │
│  📸 Sarah_Snap (Level 10)           │
│      Last active: 5m ago            │
│      [💬 Challenge] [📊 Compare]    │
│                                     │
│  📸 Mike_Cam (Level 9)              │
│      Currently hunting...           │
│      [💬 Challenge] [📊 Compare]    │
│                                     │
│  ⚫ OFFLINE (9 friends)             │
│  [👁️ View All]                     │
│                                     │
│  🎯 FRIEND CHALLENGES               │
│                                     │
│  💬 Alex challenged you:            │
│      "First to find yellow car!"   │
│      [✅ Accept] [❌ Decline]       │
│                                     │
│  📊 RECENT ACTIVITY                 │
│  • Sarah won "Blue Sign" 2h ago    │
│  • Mike reached Level 9 yesterday  │
│  • Alex started 5-win streak       │
│                                     │
│    [➕ Add Friends] [🏆 Challenges] │
└─────────────────────────────────────┘
```

## 📊 **Statistics & Analytics Dashboard**

### **Personal Statistics Overview**
```
┌─────────────────────────────────────┐
│  📊 Your Performance Stats          │
│  ────────────────────────────────── │
│                                     │
│  🎯 OVERALL PERFORMANCE             │
│  • Total Points: 1,247             │
│  • Current Level: 8 ⭐⭐⭐          │
│  • Global Rank: #247 📈 (+12)      │
│  • Win Rate: 45% (12/27 challenges)│
│  • Average Time: 3:24 per win      │
│                                     │
│  📈 THIS MONTH (September)          │
│  • Points Earned: 340              │
│  • Challenges Won: 4               │
│  • Events Joined: 6                │
│  • Best Streak: 3 wins 🔥          │
│                                     │
│  ⚡ SPEED RECORDS                   │
│  • Fastest Win: 1:23 (Blue Car)    │
│  • Most Points/Day: 150 (Sept 12)  │
│  • Longest Streak: 5 wins          │
│                                     │
│  🏆 ACHIEVEMENTS PROGRESS           │
│  • Speed Demon: 8/10 sub-2min wins │
│  • Consistent: 12/20 daily logins  │
│  • Social: 3/5 friend challenges   │
│  • Explorer: 4/10 different events │
│                                     │
│    [📅 Detailed History]           │
│    [📊 Compare with Friends]       │
└─────────────────────────────────────┘
```

---

# 💎 **PHASE 4: Advanced Features & Polish**
*Duration: 2-3 weeks*
*Priority: Retention & Monetization*

## 🎁 **Rewards & Achievement System**

### **Profile & Achievement Hub**
```
┌─────────────────────────────────────┐
│  ← Back         Your Profile        │
│  ────────────────────────────────── │
│                                     │
│  📷 [Custom Avatar]  PhotoHunter_Pro│
│                     Level 8 ⭐⭐⭐   │
│                     1,247 pts total │
│                     Member since:   │
│                     Aug 15, 2025    │
│                                     │
│  🏆 ACHIEVEMENTS (12/25 unlocked):  │
│                                     │
│  [🎯] First Shot    [🔥] Hot Streak │
│  "Take first pic"   "5 wins in row" │
│  ✅ UNLOCKED       ✅ UNLOCKED      │
│                                     │
│  [📸] Shutterbug    [👑] Week Winner│
│  "100 submissions"  "Win weekly"    │
│  ✅ UNLOCKED       🔒 LOCKED        │
│                                     │
│  [🎪] Event Master  [⚡] Speed Demon│
│  "Join 10 events"   "Win under 60s" │
│  ✅ UNLOCKED       🔒 3/10 progress │
│                                     │
│  🖼️ REWARD COLLECTION (6/50):      │
│                                     │
│  [🟦] [🟩] [🟪] [🟧] [🟥] [⬛]      │
│  Blue  Green Purple Orange Red  Elite│
│                                     │
│  🔒 LOCKED COLLECTION PREVIEWS:     │
│  [⬜] [⬜] [⬜] [⬜] [⬜] [⬜]        │
│  Gold  Silver Bronze Rainbow Cosmic │
│                                     │
│  🎖️ SPECIAL BADGES:                 │
│  🥇 First Win  🏆 Event Champion    │
│  📸 Perfect Shot  ⚡ Lightning Fast │
│                                     │
│  📊 [View Detailed Stats]           │
│  📤 [Share Profile]                 │
│  ⚙️ [Privacy Settings]              │
└─────────────────────────────────────┘
```

### **Badge Collection Gallery**
```
┌─────────────────────────────────────┐
│  🎁 Badge Collection (6/50)        │
│  [🔍 Search] [📂 Categories] [⚙️]   │
│  ────────────────────────────────── │
│                                     │
│  ✅ UNLOCKED BADGES (6):            │
│                                     │
│  🟦 Starter Badge                   │
│  "Welcome to PicTact!"              │
│  Earned: Aug 15, 2025               │
│                                     │
│  🟩 First Win                       │
│  "Your first victory!"              │
│  Earned: Aug 16, 2025               │
│                                     │
│  🟪 Speedster                       │
│  "Win in under 2 minutes"           │
│  Earned: Aug 20, 2025               │
│                                     │
│  🟧 Streak Master                   │
│  "5 consecutive wins"               │
│  Earned: Aug 28, 2025               │
│                                     │
│  🟥 Event Hero                      │
│  "Win an entire event"              │
│  Earned: Sept 5, 2025               │
│                                     │
│  ⬛ Elite Hunter                    │
│  "100 total points"                 │
│  Earned: Sept 10, 2025              │
│                                     │
│  🔒 LOCKED BADGES (44):             │
│                                     │
│  ⬜ Photo Pro (Unlock: 500 pts)     │
│  ⬜ Global Champ (Unlock: Top 100)  │
│  ⬜ Social Star (Unlock: 10 friends)│
│  ⬜ Trend Setter (Unlock: Viral pic)│
│  ⬜ Night Owl (Unlock: Win at 2AM)  │
│  [... 39 more badges]               │
│                                     │
│  💡 Tip: Earn badges by completing  │
│     challenges, achievements, and   │
│     special events!                 │
│                                     │
│    [🏠 Home] [🏆 Achievements]      │
└─────────────────────────────────────┘
```

### **Customization & Personalization**
```
┌─────────────────────────────────────┐
│  🎨 Customize Profile               │
│  ────────────────────────────────── │
│                                     │
│  📷 PROFILE PICTURE:                │
│  [Current: Default Avatar]          │
│  • [📸 Take New Photo]              │
│  • [📁 Choose from Gallery]         │
│  • [🎨 Generate AI Avatar]          │
│                                     │
│  ✏️ DISPLAY NAME:                   │
│  [PhotoHunter_Pro________]           │
│  ✅ Available                       │
│                                     │
│  🎯 PROFILE BADGE DISPLAY:          │
│  Choose up to 3 badges to show:     │
│  [🟦 Starter] [🟩 First Win] [🟪 Speedster]│
│                                     │
│  🎨 THEME SELECTION:                │
│  ○ Classic Orange (Default)         │
│  ○ Ocean Blue (Unlocked)            │
│  ○ Forest Green (Unlocked)          │
│  ○ Sunset Purple (🔒 Reach Level 10)│
│  ○ Golden Elite (🔒 Top 50 Global)  │
│                                     │
│  🔊 SOUND PREFERENCES:              │
│  ✅ Camera Shutter Sound            │
│  ✅ Victory Celebrations            │
│  ✅ Challenge Notifications         │
│  ❌ Background Music                │
│                                     │
│  📱 NOTIFICATION SETTINGS:          │
│  ✅ New Challenges (Push)           │
│  ✅ Friend Activity (Push)          │
│  ✅ Event Reminders (Push)          │
│  ❌ Marketing Updates (Email)       │
│                                     │
│    [💾 Save Changes] [↩️ Reset]     │
└─────────────────────────────────────┘
```

## ⚡ **Advanced Animations & Micro-Interactions**

### **Page Transitions**
```css
/* Slide Navigation */
@keyframes slideInLeft {
  0% { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

/* Modal Animations */
@keyframes modalSlideUp {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* Tab Switching */
@keyframes tabFadeIn {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

### **Success Celebrations**
```css
/* Victory Confetti Animation */
@keyframes confettiDrop {
  0% { 
    transform: translateY(-100vh) rotate(0deg); 
    opacity: 1; 
  }
  100% { 
    transform: translateY(100vh) rotate(720deg); 
    opacity: 0; 
  }
}

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--primary-orange);
  animation: confettiDrop 3s linear infinite;
}

.confetti-piece:nth-child(odd) { background: var(--success-green); }
.confetti-piece:nth-child(3n) { background: var(--warning-yellow); }
.confetti-piece:nth-child(4n) { background: var(--info-blue); }
```

### **Loading & Skeleton States**
```css
/* Content Loading Placeholder */
.skeleton-loader {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Button Loading State */
@keyframes buttonSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-loading::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: buttonSpin 0.8s linear infinite;
  margin-right: 8px;
}
```

### **Gesture & Touch Interactions**
```css
/* Pull to Refresh */
@keyframes pullToRefresh {
  0% { transform: translateY(-100px) scale(0); }
  50% { transform: translateY(-50px) scale(1.2); }
  100% { transform: translateY(0) scale(1); }
}

/* Swipe Gestures */
.swipe-card {
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.swipe-card.swipe-left {
  transform: translateX(-100%) rotate(-10deg);
}

.swipe-card.swipe-right {
  transform: translateX(100%) rotate(10deg);
}

/* Haptic Feedback Classes */
.haptic-light { /* Trigger light haptic */ }
.haptic-medium { /* Trigger medium haptic */ }
.haptic-heavy { /* Trigger heavy haptic */ }
```

## 📱 **Responsive Design Implementation**

### **Mobile Portrait (320px - 480px)**
```css
@media (max-width: 480px) {
  .main-container {
    padding: 8px;
    font-size: 14px;
  }
  
  .challenge-card {
    height: 240px;
    padding: 16px;
  }
  
  .btn-capture {
    width: 100%;
    height: 56px;
    font-size: 18px;
  }
  
  .leaderboard-item {
    padding: 12px 8px;
  }
  
  .timer-display {
    font-size: 20px;
  }
}
```

### **Mobile Landscape (481px - 768px)**
```css
@media (min-width: 481px) and (max-width: 768px) {
  .main-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 16px;
  }
  
  .challenge-section {
    grid-column: 1;
  }
  
  .leaderboard-section {
    grid-column: 2;
    position: sticky;
    top: 60px;
    height: fit-content;
  }
}
```

### **Tablet & Desktop (769px+)**
```css
@media (min-width: 769px) {
  .main-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    gap: 24px;
  }
  
  .events-sidebar {
    grid-column: 1;
  }
  
  .main-content {
    grid-column: 2;
  }
  
  .stats-sidebar {
    grid-column: 3;
  }
  
  .challenge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }
}
```

## 🔧 **Performance Optimizations**

### **Image Handling**
```javascript
// Progressive image loading
const optimizeImage = (file, maxWidth = 1080, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Lazy loading with intersection observer
const lazyLoadImages = () => {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
};
```

### **Caching Strategy**
```javascript
// Service Worker for offline functionality
const CACHE_NAME = 'pictact-v1.0';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/icons/',
  '/api/challenges/active'
];

// Cache-first strategy for static assets
// Network-first strategy for API calls
// Background sync for photo uploads
```

### **Real-time Updates**
```javascript
// WebSocket connection management
class PictactWebSocket {
  constructor() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }
  
  connect() {
    this.ws = new WebSocket('wss://api.pictact.com/ws');
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('Connected to PicTact');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
      }
    };
  }
  
  handleMessage(data) {
    switch(data.type) {
      case 'new_challenge':
        this.updateChallenge(data.challenge);
        break;
      case 'leaderboard_update':
        this.updateLeaderboard(data.leaderboard);
        break;
      case 'challenge_complete':
        this.showResults(data.results);
        break;
    }
  }
}
```

---

## 🎯 **Implementation Timeline & Priorities**

### **Phase 1 (Weeks 1-3): Foundation**
- ✅ Basic UI components and design system
- ✅ Challenge display and timer functionality  
- ✅ User authentication and profile basics
- ✅ Core navigation and responsive layout

### **Phase 2 (Weeks 4-6): Core Features**
- 📸 Camera integration and photo capture
- 🏆 Submission flow and result screens
- 💫 Basic animations and transitions
- 🔄 Real-time updates via WebSocket

### **Phase 3 (Weeks 7-9): Social & Competitive**
- 🎪 Event management system
- 👑 Leaderboards and rankings
- 👥 Friends and social features  
- 📊 Statistics and analytics

### **Phase 4 (Weeks 10-12): Polish & Advanced**
- 🎁 Complete achievement system
- 🖼️ Badge collection and rewards
- ⚡ Advanced animations and micro-interactions
- 🚀 Performance optimizations and PWA features

## 📋 **Technical Requirements**

### **Frontend Stack**
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS + Custom CSS animations
- **State Management**: Redux Toolkit + RTK Query
- **Camera**: Native camera API + Canvas for image processing
- **Animations**: Framer Motion + CSS transitions
- **PWA**: Service Worker + Web App Manifest

### **Backend Integration**
- **Real-time**: WebSocket connections for live updates
- **API**: RESTful endpoints for CRUD operations
- **File Upload**: Image optimization and cloud storage
- **Authentication**: JWT tokens with refresh logic
- **Caching**: Redis for leaderboards and active challenges

### **Performance Targets**
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 500KB gzipped
- **Image Loading**: Progressive with WebP support
- **Offline Support**: Core features available offline

---

*This documentation serves as the complete blueprint for PicTact's UI/UX implementation across all four development phases. Each phase builds upon the previous one, ensuring a scalable and maintainable codebase while delivering an exceptional user experience.* 🎯📸

# 🕵️ Hidden Word

> Real-time multiplayer social deduction party game. Find the Imposters — or become one.

## How to Play

1. Host creates a room and shares the invite link
2. Friends join from their phone or PC (no account needed)
3. Everyone gets a secret word — except the Imposters
4. Discuss clues on Discord voice chat
5. Vote to eliminate who you think is the Imposter
6. Normal players win if all Imposters are eliminated!

---

## Running Locally (Development)

### Prerequisites
- Node.js 18+
- npm

### 1. Install dependencies
```bash
npm install
```

### 2. Start both server and client
```bash
npm run dev
```

- **Client (React)**: http://localhost:5173
- **Server (Socket.IO)**: http://localhost:3001

### Test with multiple players
Open multiple browser tabs or devices on the same WiFi pointing to `http://<your-ip>:5173`

---

## Deploying to Railway (Free — public URL for friends)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial Hidden Word game"
git remote add origin https://github.com/YOUR_USERNAME/hidden-word.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) → New Project
2. Select **Deploy from GitHub repo**
3. Select your `hidden-word` repo
4. Click **Deploy** — Railway auto-builds and deploys
5. Go to **Settings → Networking → Generate Domain**
6. Share the URL with friends: `https://hidden-word-xxxx.up.railway.app`

### Step 3: PWA Install on Android
1. Friends open the Railway URL in Chrome on Android
2. Chrome shows **"Add to Home Screen"** banner
3. Tap → Hidden Word installs as a native-looking app
4. No App Store needed!

---

## Architecture

```
client/ (React + Vite + Tailwind + Framer Motion)
  └── PWA (installable on Android)

server/ (Node.js + Express + Socket.IO)
  └── In-memory rooms (no database needed)
```

### Anti-cheat
- Secret word and imposter list are **never** sent to all clients
- Each player only receives their own role payload
- Votes are hidden until all players vote or timer expires

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Real-time | Socket.IO |
| Backend | Node.js + Express |
| Deployment | Railway |
| PWA | vite-plugin-pwa |

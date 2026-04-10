# FEU Tech SOLAR Slot Watcher 👁️

A standalone application to monitor FEU Tech course availability and notify you via Telegram the moment a slot opens up.

## 🚀 Features
- **Passive Monitoring**: Zero-impact polling that reads locally synced course data.
- **Quiet Mode**: Notifications are ONLY sent if at least one open slot is detected (no more heartbeat spam).
- **Schedule Maker Integration**: Automatically listens to the `courses.xlsx` file from the Schedule Maker project.
- **Activity Stream**: Live-scrolling logs via Server-Sent Events (SSE).
- **Dynamic Config**: Change your monitoring interval (e.g., 1, 15, 30 mins) in real-time.

## 🛠️ Setup Instructions

### 1. Installation
Cloning and installing dependencies:
```bash
# In the slot-watcher root
npm run install:all
npx playwright install chromium
```

### 2. Configuration
Create a `.env` file in the root (a template was created for you) and fill in your details:
- `SOLAR_USERNAME`: Your FEU email.
- `SOLAR_PASSWORD`: Your SOLAR password.
- `TELEGRAM_BOT_TOKEN`: Get this from [@BotFather](https://t.me/botfather).
- `TELEGRAM_CHAT_ID`: Get this from [@userinfobot](https://t.me/userinfobot).

### 3. Running the App
Start both the backend and frontend:
```bash
npm run dev
```

## 📋 Unified Workflow (Run Both)
1. **Start Schedule Maker Backend:** Ensure the bridge is running (`node server.js` in scraper folder).
2. **Start Slot Watcher Backend:** Ensure port 3002 is active.
3. **Configure Scaling:**
   - In Schedule Maker UI: Set **Auto-Scrape** to `15 Mins`.
   - In Slot Watcher UI: Set **Interval** to `15 Mins`.
4. **Result:** Every 15 minutes, the Scraper updates the file (beams MFA code to your phone), and the Watcher immediately pings you if a slot opened up!

---
*Note: The Slot Watcher is now perfectly integrated with the Schedule Maker for ultimate data accuracy.*

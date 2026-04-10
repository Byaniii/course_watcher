# FEU Tech SOLAR Slot Watcher 👁️

A standalone application to monitor FEU Tech course availability and notify you via Telegram the moment a slot opens up.

## 🚀 Features
- **Real-time Monitoring**: Automatically polls SOLAR offerings at configurable intervals.
- **MFA-Aware**: Reuses the Playwright authentication flow to handle Microsoft SSO.
- **Immediate Notifications**: Sends a detailed message to your Telegram bot when a 0-slot course becomes available.
- **Activity Stream**: Live-scrolling logs via Server-Sent Events (SSE).
- **Persistent Watchlist**: Saves your monitored courses to `watchlist.json`.

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

## 📋 usage
1. Open [http://localhost:5173](http://localhost:5173).
2. Click **Re-Authenticate** to perform the initial login. Approve the MFA on your phone.
3. Add a course to watch in the format `COURSE-SECTION` (e.g., `CCS0015-TC03`).
4. Click **Start Watcher**.
5. Keep the app running (or the server running) to stay updated!

---
*Note: This app is standalone and does not interfere with the Schedule Maker project.*

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config({ path: '../.env' });

const WATCHLIST_PATH = path.join(__dirname, 'watchlist.json');
const LOGS_LIMIT = 200;

class SlotWatcher {
    constructor() {
        this.watchlist = [];
        this.isRunning = false;
        this.lastChecked = null;
        this.interval = null;
        this.bot = null;
        this.logs = [];
        this.sseClients = new Set();
        this.cooldowns = new Map(); // key: course-section, value: lastNotifyTimestamp
        
        // Dynamic Settings
        this.activeTerm = '3';
        this.activeYear = '20242025';
        this.intervalMin = parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5;

        this.loadWatchlist();
        this.initTelegram();
    }

    loadWatchlist() {
        if (fs.existsSync(WATCHLIST_PATH)) {
            try {
                this.watchlist = JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
            } catch (err) {
                console.error('[WATCHER] Failed to load watchlist:', err);
                this.watchlist = [];
            }
        }
    }

    saveWatchlist() {
        fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(this.watchlist, null, 2));
    }

    initTelegram() {
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
                this.log('System', `Telegram Bot initialized. Monitoring ${this.watchlist.length} sections.`, 'blue');
                this.notify('✅ Slot Watcher is now running and monitoring list.');
            } catch (err) {
                this.log('Error', 'Failed to init Telegram: ' + err.message, 'red');
            }
        } else {
            this.log('System', 'Telegram credentials missing. Notifications disabled.', 'blue');
        }
    }

    log(type, message, color = 'gray') {
        const entry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            color
        };
        this.logs.unshift(entry);
        if (this.logs.length > LOGS_LIMIT) this.logs.pop();
        
        // Broadcast to SSE
        const data = JSON.stringify(entry);
        this.sseClients.forEach(client => client.res.write(`data: ${data}\n\n`));
        console.log(`[${type}] ${message}`);
    }

    async notify(message) {
        if (this.bot && process.env.TELEGRAM_CHAT_ID) {
            try {
                await this.bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error('[WATCHER] Telegram notify failed:', err);
            }
        }
    }

    async checkSlots() {
        this.log('Check', 'Running scheduled extraction from local courses data...', 'blue');
        
        try {
            // Read directly from Schedule Maker's output
            const xlsxPath = require('path').resolve(__dirname, '../../schedue_maker/scraper/courses.xlsx');
            if (!require('fs').existsSync(xlsxPath)) {
                this.log('Error', 'courses.xlsx not found in Schedule Maker folder.', 'red');
                return;
            }
            
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(xlsxPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const allCourses = xlsx.utils.sheet_to_json(sheet);
            
            // Filter down to the active term/year chosen in settings
            const activeCourses = allCourses.filter(c => String(c.term) === String(this.activeTerm) && String(c.schoolYear) === String(this.activeYear));
            
            let messageLines = ['🗓️ *AUTOMATED SLOT UPDATE*'];
            messageLines.push(`Term: *${this.activeTerm}* | SY: *${this.activeYear}*\n`);

            let anyOpenSlots = false;
            for (const item of this.watchlist) {
                const courseData = activeCourses.find(c => String(c.course) === String(item.course) && String(c.section) === String(item.section));
                
                if (!courseData) {
                    this.log('Error', `${item.course}-${item.section}: Not found in extraction.`, 'red');
                    messageLines.push(`• *${item.course}* (${item.section}): ⚠️ Not Found`);
                    continue;
                }

                const currentSlots = courseData.remaining;
                if (currentSlots > 0) anyOpenSlots = true;
                
                // Highlight changes
                if (currentSlots > 0 && item.lastSlots === 0) {
                    this.log('WATCH', `🟢 SLOT OPENED! ${item.course}-${item.section}: ${currentSlots} slots`, 'green');
                    messageLines.push(`• *${item.course}* (${item.section}): 🟢 *${currentSlots} SLOTS OPEN!*`);
                } else {
                    this.log('Info', `${item.course}-${item.section}: ${currentSlots} slots`, 'gray');
                    messageLines.push(`• *${item.course}* (${item.section}): ${currentSlots > 0 ? `*${currentSlots}*` : '0'} slots`);
                }

                item.lastSlots = currentSlots;
                item.lastChecked = new Date().toLocaleTimeString();
            }

            if (anyOpenSlots && this.watchlist.length > 0) {
                this.notify(messageLines.join('\n'));
            } else {
                this.log('Info', 'Check complete: No open slots detected. Skipping notification.', 'gray');
            }

        } catch (err) {
            this.log('Error', `Scheduled extraction failed: ${err.message}`, 'red');
        }

        this.lastChecked = new Date().toLocaleTimeString();
        this.saveWatchlist();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.log('System', 'Watcher interval started.', 'blue');
        
        const intervalMs = this.intervalMin * 60000;
        this.checkSlots(); // Initial check
        this.interval = setInterval(() => this.checkSlots(), intervalMs);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.interval);
        this.log('System', 'Watcher interval stopped.', 'gray');
    }

    add(course, section) {
        const exists = this.watchlist.find(i => i.course === course && i.section === section);
        if (exists) return false;
        
        this.watchlist.push({ course, section, lastSlots: 0, lastChecked: null });
        this.saveWatchlist();
        this.log('System', `Added ${course}-${section} to watchlist.`, 'blue');
        return true;
    }

    remove(course, section) {
        this.watchlist = this.watchlist.filter(i => !(i.course === course && i.section === section));
        this.saveWatchlist();
        this.log('System', `Removed ${course}-${section} from watchlist.`, 'blue');
        return true;
    }

    async syncAllCourses() {
        if (!this.cookies) throw new Error('No authentication cookies.');
        this.log('System', 'Fetching all courses from SOLAR...', 'blue');

        const bodyParams = new URLSearchParams({
            term: this.activeTerm,
            school_year: this.activeYear,
            submit: 'submit'
        }).toString();

        const response = await fetch('https://solar.feutech.edu.ph/course/offerings', {
            method: 'POST',
            headers: {
                'Cookie': this.cookies,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: bodyParams
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const allCourses = [];
        $('table tr').each((i, row) => {
            const tds = $(row).find('td');
            if (tds.length >= 7) {
                const course = $(tds[0]).text().trim();
                // Skip header row
                if (course === 'COURSE' || course === '') return;
                
                const section = $(tds[1]).text().trim();
                const classSize = parseInt($(tds[2]).text().trim()) || 0;
                const remaining = parseInt($(tds[3]).text().trim()) || 0;
                const day = $(tds[4]).text().trim();
                const time = $(tds[5]).text().trim();
                const room = $(tds[6]).text().trim();

                let timeStart = time;
                let timeEnd = time;
                if (time.includes('/')) {
                    const periods = time.split('/').map(p => p.trim());
                    const starts = [];
                    const ends = [];
                    periods.forEach(p => {
                        if (p.includes('-')) {
                            const parts = p.split('-');
                            starts.push(parts[0].trim());
                            ends.push(parts[1].trim());
                        } else {
                            starts.push(p);
                            ends.push(p);
                        }
                    });
                    timeStart = starts.join(' / ');
                    timeEnd = ends.join(' / ');
                } else if (time.includes('-')) {
                    const parts = time.split('-');
                    timeStart = parts[0].trim();
                    timeEnd = parts[1].trim();
                }

                allCourses.push({
                    id: `${course}-${section}-${i}`,
                    course,
                    section,
                    classSize,
                    remaining,
                    day,
                    timeStart,
                    timeEnd,
                    time,
                    room,
                    term: this.activeTerm,
                    schoolYear: this.activeYear
                });
            }
        });

        fs.writeFileSync(path.join(__dirname, 'courses.json'), JSON.stringify(allCourses, null, 2));
        this.log('System', `Successfully synced ${allCourses.length} courses from SOLAR.`, 'green');
        return allCourses;
    }

    getStatus() {
        return {
            running: this.isRunning,
            lastChecked: this.lastChecked,
            telegramConnected: !!this.bot,
            watchList: this.watchlist,
            settings: {
                term: this.activeTerm,
                year: this.activeYear
            }
        };
    }

    updateSettings(settings) {
        if (settings.term) this.activeTerm = settings.term;
        if (settings.year) this.activeYear = settings.year;
        this.log('System', `Settings updated: Term ${this.activeTerm}, Year ${this.activeYear}`, 'blue');
    }
}

module.exports = new SlotWatcher();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const watcher = require('./watcher');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json(watcher.getStatus());
});

// Control endpoints
app.post('/api/start', (req, res) => {
    watcher.start();
    res.json({ success: true });
});

app.post('/api/stop', (req, res) => {
    watcher.stop();
    res.json({ success: true });
});

// Watchlist endpoints
app.post('/api/watch', (req, res) => {
    const { course, section } = req.body;
    if (!course || !section) return res.status(400).json({ error: 'Missing course or section' });
    const success = watcher.add(course.toUpperCase(), section.toUpperCase());
    res.json({ success });
});

app.delete('/api/watch', (req, res) => {
    const { course, section } = req.body;
    const success = watcher.remove(course.toUpperCase(), section.toUpperCase());
    res.json({ success });
});

app.post('/api/settings', (req, res) => {
    watcher.updateSettings(req.body);
    res.json({ success: true });
});

// Course List Fetching
app.get('/api/courses', (req, res) => {
    try {
        const xlsxPath = require('path').resolve(__dirname, '../../schedue_maker/scraper/courses.xlsx');
        if (require('fs').existsSync(xlsxPath)) {
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(xlsxPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const courses = xlsx.utils.sheet_to_json(sheet);
            // Re-map keys if needed, but json_to_sheet outputs the exact JSON array we saved!
            return res.json(courses);
        }

        const data = require('fs').readFileSync(require('path').join(__dirname, 'courses.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch {
        res.json([]);
    }
});



// SSE endpoint
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = { id: Date.now(), res };
    watcher.sseClients.add(client);

    // Send the last few logs on connect
    watcher.logs.slice().reverse().forEach(log => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    req.on('close', () => {
        watcher.sseClients.delete(client);
    });
});

app.listen(PORT, () => {
    console.log(`[SERVER] Slot Watcher API running on http://localhost:${PORT}`);
    watcher.log('System', `Server started on port ${PORT}`, 'blue');
});

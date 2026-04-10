const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config({ path: '../.env' });

const token = '8699737205:AAFrhIk1m2KCwjrKeKayZy27x0B4Xq61DM8';
const chatId = '6896370342';

console.log('Testing Telegram connection...');
const bot = new TelegramBot(token);

bot.sendMessage(chatId, '✅ *Slot Watcher Test Message*\n\nYour Telegram Bot is successfully connected and working!', { parse_mode: 'Markdown' })
    .then(() => {
        console.log('SUCCESS: Test message sent! Check your Telegram.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('ERROR: Failed to send message:', err.message);
        process.exit(1);
    });

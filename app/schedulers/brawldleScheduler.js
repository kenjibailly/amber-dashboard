const BrawldleDaily = require("../models/BrawldleDaily");
const path = require("path");

// Returns today's date string in UTC: "2026-03-09"
function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// Picks the daily brawler for a given date.
// Uses a deterministic seed based on the date so every instance
// of the bot always picks the same brawler for the same day.
function pickBrawlerForDate(dateStr, brawlers) {
  // Simple numeric hash of the date string
  let hash = 0;
  for (const char of dateStr) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return brawlers[hash % brawlers.length];
}

async function ensureTodayExists() {
  const today = getTodayUTC();

  const existing = await BrawldleDaily.findOne({ date: today });
  if (existing) return existing;

  // Load brawlers from config
  let brawlers;
  try {
    brawlers = require(
      path.join(__dirname, "../config/brawlers.json"),
    ).brawlers;
  } catch (err) {
    logger.error("brawldleScheduler: Failed to load brawlers.json", err);
    return null;
  }

  if (!brawlers || brawlers.length === 0) {
    logger.error("brawldleScheduler: brawlers.json is empty");
    return null;
  }

  const brawler = pickBrawlerForDate(today, brawlers);

  const daily = await BrawldleDaily.create({
    date: today,
    brawlerName: brawler.name,
  });

  logger.info(`Brawldle: Today's brawler is "${brawler.name}" (${today})`);
  return daily;
}

// Runs at startup and then checks every minute whether the date has rolled over.
// Midnight UTC will trigger a new daily entry automatically on the next check.
function startBrawldleScheduler() {
  logger.info("Starting Brawldle daily scheduler...");

  ensureTodayExists();

  // Check once per minute — cheap DB call that no-ops if today already exists
  setInterval(() => {
    ensureTodayExists();
  }, 60 * 1000);
}

module.exports = { startBrawldleScheduler, ensureTodayExists, getTodayUTC };

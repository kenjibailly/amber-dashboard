const express = require("express");
const router = express.Router();
const { requireSession } = require("../admin/middleware");
const BrawldleDaily = require("../../models/BrawldleDaily");
const BrawldleUser = require("../../models/BrawldleUser");
const BrawldleMonthly = require("../../models/BrawldleMonthly");
const getCurrentMonthStr = () => new Date().toISOString().slice(0, 7);

const {
  postBrawldleMessage,
  postWinAnnouncement,
} = require("../../helpers/postBrawldleMessage");

const getTodayUTC = () => new Date().toISOString().slice(0, 10);
const brawlers = require("../../config/brawlers.json").brawlers;

// ── Order maps ────────────────────────────────────────────────────────────────

const RARITY_ORDER = [
  "Starter",
  "Rare",
  "Super Rare",
  "Epic",
  "Mythic",
  "Legendary",
  "Ultra Legendary",
];
const SPEED_ORDER = ["Very Slow", "Slow", "Normal", "Fast", "Very Fast"];
const RANGE_ORDER = ["Short", "Normal", "Long", "Very Long"];

function compareOrdered(order, guessVal, answerVal) {
  const gi = order.indexOf(guessVal);
  const ai = order.indexOf(answerVal);
  if (gi === ai) return "correct";
  return gi < ai ? "up" : "down";
}

function compareBrawler(guess, answer) {
  return {
    name: {
      value: guess.name,
      image: guess.image,
      result: guess.name === answer.name ? "correct" : "wrong",
    },
    rarity: {
      value: guess.rarity,
      result: compareOrdered(RARITY_ORDER, guess.rarity, answer.rarity),
    },
    class: {
      value: guess.class,
      result: guess.class === answer.class ? "correct" : "wrong",
    },
    movement: {
      value: guess.movement,
      result: compareOrdered(SPEED_ORDER, guess.movement, answer.movement),
    },
    range: {
      value: guess.range,
      result: compareOrdered(RANGE_ORDER, guess.range, answer.range),
    },
    reload: {
      value: guess.reload,
      result: compareOrdered(SPEED_ORDER, guess.reload, answer.reload),
    },
    release: {
      value: guess.release,
      result:
        guess.release === answer.release
          ? "correct"
          : parseInt(guess.release) < parseInt(answer.release)
            ? "up"
            : "down",
    },
  };
}

// ── GET /api/brawldle/today ───────────────────────────────────────────────────

router.get("/today", requireSession, async (req, res) => {
  try {
    const today = getTodayUTC();
    const userId = req.session.user.id;

    const daily = await BrawldleDaily.findOne({ date: today });
    if (!daily)
      return res
        .status(503)
        .json({ error: "Today's brawler is not ready yet." });

    const answer = brawlers.find(
      (b) => b.name.toLowerCase() === daily.brawlerName.toLowerCase(),
    );
    if (!answer)
      return res
        .status(500)
        .json({ error: "Today's brawler not found in brawlers.json." });

    let userDoc = await BrawldleUser.findOne({ userId });

    if (!userDoc || userDoc.activeDate !== today) {
      return res.json({
        date: today,
        guesses: [],
        wonToday: false,
        totalBrawlers: brawlers.length,
        brawlerNames: brawlers.map((b) => ({ name: b.name, image: b.image })),
      });
    }

    const guessResults = userDoc.guesses
      .map((guessName) => {
        const guessBrawler = brawlers.find(
          (b) => b.name.toLowerCase() === guessName.toLowerCase(),
        );
        if (!guessBrawler) return null;
        return compareBrawler(guessBrawler, answer);
      })
      .filter(Boolean);

    return res.json({
      date: today,
      guesses: guessResults,
      wonToday: userDoc.wonToday,
      totalBrawlers: brawlers.length,
      brawlerNames: brawlers.map((b) => ({ name: b.name, image: b.image })),
      answer: userDoc.wonToday ? answer : undefined,
    });
  } catch (err) {
    logger.error("GET /brawldle/today error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/brawldle/start-session ─────────────────────────────────────────

router.post("/start-session", requireSession, async (req, res) => {
  try {
    const today = getTodayUTC();
    const user = req.session.user;
    const userId = user.id;
    const { guildId, channelId } = req.body;

    if (!guildId || !channelId) {
      return res
        .status(400)
        .json({ error: "guildId and channelId are required." });
    }

    const daily = await BrawldleDaily.findOne({ date: today });
    if (!daily)
      return res
        .status(503)
        .json({ error: "Today's brawler is not ready yet." });

    const totalDays = await BrawldleDaily.countDocuments();

    let userDoc = await BrawldleUser.findOne({ userId });
    if (!userDoc) userDoc = new BrawldleUser({ userId });

    userDoc.activeGuildId = guildId;
    userDoc.activeChannelId = channelId;

    if (userDoc.activeDate !== today) {
      userDoc.activeDate = today;
      userDoc.guesses = [];
      userDoc.wonToday = false;
      userDoc.activeMessageId = null;
      await BrawldleDaily.updateOne(
        { date: today },
        { $inc: { totalPlayers: 1 } },
      );
    }

    await userDoc.save();

    const answer = brawlers.find(
      (b) => b.name.toLowerCase() === daily.brawlerName.toLowerCase(),
    );
    const guessResults = userDoc.guesses
      .map((guessName) => {
        const gb = brawlers.find(
          (b) => b.name.toLowerCase() === guessName.toLowerCase(),
        );
        return gb ? compareBrawler(gb, answer) : null;
      })
      .filter(Boolean);

    postBrawldleMessage({
      user,
      userDoc,
      guesses: guessResults,
      brawldleNumber: totalDays,
      won: userDoc.wonToday,
    }).catch((err) =>
      logger.error("Failed to post initial brawldle message:", err),
    );

    res.json({ success: true });
  } catch (err) {
    logger.error("POST /brawldle/start-session error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/brawldle/guess ──────────────────────────────────────────────────

router.post("/guess", requireSession, async (req, res) => {
  try {
    const today = getTodayUTC();
    const user = req.session.user;
    const userId = user.id;
    const { brawlerName } = req.body;

    if (!brawlerName)
      return res.status(400).json({ error: "brawlerName is required." });

    const daily = await BrawldleDaily.findOne({ date: today });
    if (!daily)
      return res
        .status(503)
        .json({ error: "Today's brawler is not ready yet." });

    const answer = brawlers.find(
      (b) => b.name.toLowerCase() === daily.brawlerName.toLowerCase(),
    );
    if (!answer)
      return res
        .status(500)
        .json({ error: "Today's brawler not found in brawlers.json." });

    const guessBrawler = brawlers.find(
      (b) => b.name.toLowerCase() === brawlerName.toLowerCase(),
    );
    if (!guessBrawler)
      return res.status(400).json({ error: "Unknown brawler name." });

    let userDoc = await BrawldleUser.findOne({ userId });
    if (!userDoc) userDoc = new BrawldleUser({ userId });

    if (userDoc.activeDate !== today) {
      userDoc.activeDate = today;
      userDoc.guesses = [];
      userDoc.wonToday = false;
      userDoc.activeMessageId = null;
      await BrawldleDaily.updateOne(
        { date: today },
        { $inc: { totalPlayers: 1 } },
      );
    }

    if (userDoc.wonToday)
      return res.status(400).json({ error: "You have already won today!" });

    if (
      userDoc.guesses
        .map((g) => g.toLowerCase())
        .includes(brawlerName.toLowerCase())
    ) {
      return res
        .status(400)
        .json({ error: "You already guessed that brawler." });
    }

    userDoc.guesses.push(guessBrawler.name);

    const comparison = compareBrawler(guessBrawler, answer);
    const isCorrect =
      guessBrawler.name.toLowerCase() === answer.name.toLowerCase();

    if (isCorrect) {
      userDoc.wonToday = true;
      userDoc.totalWins += 1;
      userDoc.totalGuesses += userDoc.guesses.length;

      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (userDoc.lastWinDate === yesterdayStr) {
        userDoc.currentStreak += 1;
      } else if (userDoc.lastWinDate === today) {
        // Already counted
      } else {
        userDoc.currentStreak = 1;
      }

      if (userDoc.currentStreak > userDoc.maxStreak) {
        userDoc.maxStreak = userDoc.currentStreak;
      }

      userDoc.lastWinDate = today;

      await BrawldleDaily.updateOne(
        { date: today },
        { $inc: { totalWins: 1, totalGuesses: userDoc.guesses.length } },
      );

      const month = getCurrentMonthStr();
      await BrawldleMonthly.findOneAndUpdate(
        { guildId: userDoc.activeGuildId, userId, month },
        {
          $inc: {
            wins: 1,
            totalGuesses: userDoc.guesses.length,
            daysPlayed: 1,
          },
        },
        { upsert: true },
      );
    }

    await userDoc.save();

    const totalDays = await BrawldleDaily.countDocuments();
    const allGuessResults = userDoc.guesses
      .map((guessName) => {
        const gb = brawlers.find(
          (b) => b.name.toLowerCase() === guessName.toLowerCase(),
        );
        return gb ? compareBrawler(gb, answer) : null;
      })
      .filter(Boolean);

    if (userDoc.activeChannelId) {
      // Update progress image
      postBrawldleMessage({
        user,
        userDoc,
        guesses: allGuessResults,
        brawldleNumber: totalDays,
        won: isCorrect,
      }).catch((err) =>
        logger.error("Failed to update brawldle message:", err),
      );

      // Post win announcement leaderboard
      if (isCorrect) {
        postWinAnnouncement({
          user,
          userDoc,
          brawldleNumber: totalDays,
        }).catch((err) =>
          logger.error("Failed to post win announcement:", err),
        );
      }
    }

    return res.json({
      comparison,
      isCorrect,
      guessCount: userDoc.guesses.length,
      answer: isCorrect ? answer : undefined,
    });
  } catch (err) {
    logger.error("POST /brawldle/guess error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/brawldle/stats/:userId ──────────────────────────────────────────

router.get("/stats/:userId", requireSession, async (req, res) => {
  try {
    const { userId } = req.params;
    const today = getTodayUTC();

    const [userDoc, daily] = await Promise.all([
      BrawldleUser.findOne({ userId }),
      BrawldleDaily.findOne({ date: today }),
    ]);

    const totalDays = await BrawldleDaily.countDocuments();
    const avgGuesses =
      daily && daily.totalWins > 0
        ? (daily.totalGuesses / daily.totalWins).toFixed(1)
        : null;

    return res.json({
      totalWins: userDoc?.totalWins ?? 0,
      currentStreak: userDoc?.currentStreak ?? 0,
      maxStreak: userDoc?.maxStreak ?? 0,
      averageGuesses: avgGuesses,
      totalDays,
    });
  } catch (err) {
    logger.error("GET /brawldle/stats error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;

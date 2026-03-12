import { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "../styles/Brawldle.module.css";
import { DiscordSDK } from "@discord/embedded-app-sdk";

const isInsideDiscord = new URLSearchParams(window.location.search).has(
  "frame_id",
);

const COLUMNS = [
  { key: "rarity", label: "Rarity" },
  { key: "class", label: "Class" },
  { key: "movement", label: "Movement" },
  { key: "range", label: "Range" },
  { key: "reload", label: "Reload" },
  { key: "release", label: "Release" },
];

// ── LocalStorage safety wrapper (Discord Activity iframes may block it) ───────

const getCache = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
};
const setCache = (key, val) => {
  try {
    localStorage.setItem(key, val);
  } catch (_) {}
};
const clearCache = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
};

// ── Auth ──────────────────────────────────────────────────────────────────────

async function authenticateWithDiscord() {
  if (isInsideDiscord) {
    // Try cached token first to avoid Discord OAuth rate limits
    const cachedToken = getCache("discord_access_token");
    if (cachedToken) {
      try {
        const res = await axios.post(
          "/auth/discord-activity",
          { accessToken: cachedToken }, // ✅ pass accessToken, no code needed
          { withCredentials: true },
        );
        if (res.data.user) {
          axios.defaults.headers.common["X-Discord-Token"] = cachedToken;
          return res.data.user;
        }
      } catch (_) {
        clearCache("discord_access_token");
      }
    }

    // No cached token — go through full SDK OAuth flow
    let discordSdk;
    try {
      discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    } catch (err) {
      console.error("Failed to init Discord SDK:", err);
      return null;
    }

    try {
      await discordSdk.ready();
    } catch (err) {
      console.error("Discord SDK ready() failed:", err);
      return null;
    }

    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });

    const res = await axios.post(
      "/auth/discord-activity",
      { code, sdkFlow: true }, // ✅ pass sdkFlow flag
      { withCredentials: true },
    );

    setCache("discord_access_token", res.data.access_token);
    axios.defaults.headers.common["X-Discord-Token"] = res.data.access_token;

    await discordSdk.commands.authenticate({
      access_token: res.data.access_token,
    });

    return res.data.user;
  } else {
    try {
      const res = await axios.get("/auth/session", { withCredentials: true });
      if (res.data.user) return res.data.user;
    } catch (_) {}

    const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const REDIRECT_URI = encodeURIComponent(
      `${window.location.origin}/brawldle/callback`,
    );
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify`;
    return null;
  }
}

// ── Loader ────────────────────────────────────────────────────────────────────

function Loader({ text }) {
  return (
    <div className={styles.loaderWrapper}>
      <div className={styles.loaderDots}>
        <div className={styles.loaderDot} />
        <div className={styles.loaderDot} />
        <div className={styles.loaderDot} />
      </div>
      <span className={styles.loaderText}>{text}</span>
    </div>
  );
}

// ── GuessRow ──────────────────────────────────────────────────────────────────

function Cell({ value, result, index, isNew }) {
  const isCorrect = result === "correct";
  const arrow = result === "up" ? " ↑" : result === "down" ? " ↓" : "";
  return (
    <div
      className={`${styles.cell} ${isCorrect ? styles.correct : styles.wrong}`}
      style={
        isNew ? { animationDelay: `${index * 0.1}s` } : { animation: "none" }
      }
    >
      <span className={styles.cellValue}>
        {value}
        {arrow}
      </span>
    </div>
  );
}

function GuessRow({ comparison, isNew }) {
  const isCorrect = comparison.name.result === "correct";
  return (
    <div className={styles.guessRow}>
      <div
        className={`${styles.cell} ${styles.nameCell} ${isCorrect ? styles.correct : styles.wrong}`}
        style={isNew ? { animationDelay: "0s" } : { animation: "none" }}
      >
        <img
          src={`/brawlers/${comparison.name.image}.png`}
          alt={comparison.name.value}
          className={styles.brawlerIcon}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>
      {COLUMNS.map((col, i) => (
        <Cell
          key={col.key}
          value={comparison[col.key].value}
          result={comparison[col.key].result}
          index={i + 1}
          isNew={isNew}
        />
      ))}
    </div>
  );
}

// ── StatsModal ────────────────────────────────────────────────────────────────

function StatsModal({ stats, guessCount, answer, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>🎉 You got it!</h2>
        {answer && (
          <div className={styles.answerReveal}>
            <img
              src={`/brawlers/${answer.image}.png`}
              alt={answer.name}
              className={styles.answerIcon}
              onError={(e) => (e.target.style.display = "none")}
            />
            <p>
              Today's brawler was <strong>{answer.name}</strong>
            </p>
          </div>
        )}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{guessCount}</span>
            <span className={styles.statLabel}>Guesses today</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{stats?.totalWins ?? 0}</span>
            <span className={styles.statLabel}>Total wins</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>
              {stats?.currentStreak ?? 0}
            </span>
            <span className={styles.statLabel}>Current streak</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{stats?.maxStreak ?? 0}</span>
            <span className={styles.statLabel}>Max streak</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>
              {stats?.averageGuesses ?? "—"}
            </span>
            <span className={styles.statLabel}>Avg guesses (today)</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{stats?.totalDays ?? 0}</span>
            <span className={styles.statLabel}>Days played</span>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Game ─────────────────────────────────────────────────────────────────

export default function Brawldle() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [brawlerNames, setBrawlerNames] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [wonToday, setWonToday] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [gameLoading, setGameLoading] = useState(true);

  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [lastGuessed, setLastGuessed] = useState(null);

  const inputRef = useRef(null);

  // ── Auth on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const u = await authenticateWithDiscord();
      if (u) {
        setUser(u);
        setAuthLoading(false);
      }
    })();
  }, []);

  // ── Load game state once authenticated ───────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const guildId = params.get("guild_id");
    const channelId = params.get("channel_id");

    if (guildId && channelId) {
      axios
        .post(
          "/api/brawldle/start-session",
          { guildId, channelId },
          { withCredentials: true },
        )
        .catch((err) => console.error("Failed to start session:", err));
    }

    loadGameState();
  }, [user]);

  const loadGameState = async () => {
    setGameLoading(true);
    try {
      const res = await axios.get("/api/brawldle/today", {
        withCredentials: true,
      });
      setBrawlerNames(res.data.brawlerNames || []);
      setGuesses((res.data.guesses || []).reverse());
      setWonToday(res.data.wonToday || false);
      if (res.data.answer) setAnswer(res.data.answer);
      if (res.data.wonToday) {
        await loadStats();
        setShowStats(true);
      }
    } catch (err) {
      setError("Failed to load today's game. Please try again.");
    } finally {
      setGameLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/brawldle/stats/${user.id}`, {
        withCredentials: true,
      });
      setStats(res.data);
    } catch (_) {}
  };

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const guessedNames = guesses.map((g) => g.name?.value?.toLowerCase());

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setSelectedIdx(-1);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = brawlerNames.filter(
      (b) =>
        b.name.toLowerCase().includes(val.toLowerCase()) &&
        !guessedNames.includes(b.name.toLowerCase()),
    );
    setSuggestions(filtered.slice(0, 8));
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const brawler =
        selectedIdx >= 0 ? suggestions[selectedIdx] : suggestions[0];
      if (brawler) submitGuess(brawler.name);
      else if (input) submitGuess(input);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  };

  const submitGuess = async (brawlerName) => {
    if (submitting || wonToday) return;
    setSubmitting(true);
    setError(null);
    setInput("");
    setSuggestions([]);
    setSelectedIdx(-1);

    try {
      const res = await axios.post(
        "/api/brawldle/guess",
        { brawlerName },
        { withCredentials: true },
      );

      setLastGuessed(res.data.comparison.name.value);
      setGuesses((prev) => [res.data.comparison, ...prev]);

      if (res.data.isCorrect) {
        setWonToday(true);
        setAnswer(res.data.answer);
        await loadStats();
        setShowStats(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit guess.");
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return <Loader text="Connecting to Discord…" />;
  }

  if (gameLoading) {
    return <Loader text="Loading today's game…" />;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>🎯 Brawldle</h1>
        <p className={styles.subtitle}>Guess today's mystery brawler!</p>
        {user && (
          <div className={styles.userBadge}>
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
              alt={user.username}
              className={styles.avatar}
              onError={(e) => (e.target.style.display = "none")}
            />
            <span>{user.global_name || user.username}</span>
          </div>
        )}
      </header>

      {/* Input */}
      {!wonToday && (
        <div className={styles.inputWrapper}>
          <div className={styles.autocomplete}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a brawler name…"
              className={styles.input}
              disabled={submitting}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {suggestions.map((brawler, i) => (
                  <li
                    key={brawler.name}
                    className={`${styles.suggestion} ${i === selectedIdx ? styles.selectedSuggestion : ""}`}
                    onMouseDown={() => submitGuess(brawler.name)}
                  >
                    <img
                      src={`/brawlers/${brawler.image}.png`}
                      alt={brawler.name}
                      className={styles.suggestionIcon}
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    {brawler.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            className={styles.guessBtn}
            onClick={() => {
              const brawler = suggestions[0];
              if (brawler) submitGuess(brawler.name);
              else if (input) submitGuess(input);
            }}
            disabled={submitting || !input.trim()}
          >
            {submitting ? "…" : "Guess"}
          </button>
        </div>
      )}

      {wonToday && (
        <div className={styles.wonBanner}>
          ✅ You found <strong>{answer?.name}</strong> in {guesses.length}{" "}
          {guesses.length === 1 ? "guess" : "guesses"}!
          <button
            className={styles.statsBtn}
            onClick={() => setShowStats(true)}
          >
            View stats
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Column headers */}
      {guesses.length > 0 && (
        <div className={styles.guessGrid}>
          <div className={styles.headerRow}>
            <div className={styles.headerCell}>Brawler</div>
            {COLUMNS.map((col) => (
              <div key={col.key} className={styles.headerCell}>
                {col.label}
              </div>
            ))}
          </div>
          {guesses.map((comparison) => (
            <GuessRow
              key={comparison.name.value}
              comparison={comparison}
              isNew={comparison.name.value === lastGuessed}
            />
          ))}
        </div>
      )}

      {guesses.length === 0 && !gameLoading && (
        <div className={styles.emptyState}>
          <p>Start guessing to reveal the clues!</p>
          <p className={styles.hint}>
            Each guess shows you how close you are across 6 attributes.
          </p>
        </div>
      )}

      {/* Stats modal */}
      {showStats && (
        <StatsModal
          stats={stats}
          guessCount={guesses.length}
          answer={answer}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

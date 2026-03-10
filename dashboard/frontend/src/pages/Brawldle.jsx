import { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "../styles/Brawldle.module.css";
import { DiscordSDK } from "@discord/embedded-app-sdk";

const isInsideDiscord = new URLSearchParams(window.location.search).has(
  "frame_id",
);
console.log(
  "isInsideDiscord:",
  isInsideDiscord,
  "search:",
  window.location.search,
);

const COLUMNS = [
  { key: "rarity", label: "Rarity" },
  { key: "class", label: "Class" },
  { key: "movement", label: "Movement" },
  { key: "range", label: "Range" },
  { key: "reload", label: "Reload" },
  { key: "release", label: "Release" },
];

// ── Auth ─────────────────────────────────────────────────────────────────────

async function authenticateWithDiscord() {
  if (isInsideDiscord) {
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
      { code },
      { withCredentials: true },
    );

    await discordSdk.commands.authenticate({
      access_token: res.data.access_token,
    });

    // Store token for future requests
    axios.defaults.headers.common["X-Discord-Token"] = res.data.access_token;

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

// ── GuessRow ─────────────────────────────────────────────────────────────────

function Cell({ value, result }) {
  const isCorrect = result === "correct";
  const arrow = result === "up" ? " ↑" : result === "down" ? " ↓" : "";
  return (
    <div
      className={`${styles.cell} ${isCorrect ? styles.correct : styles.wrong}`}
    >
      <span className={styles.cellValue}>
        {value}
        {arrow}
      </span>
    </div>
  );
}

function GuessRow({ comparison, brawlerName }) {
  return (
    <div className={styles.guessRow}>
      <div
        className={`${styles.cell} ${styles.nameCell} ${comparison.name.result === "correct" ? styles.correct : styles.wrong}`}
      >
        <span className={styles.cellValue}>{brawlerName}</span>
      </div>
      {COLUMNS.map((col) => (
        <Cell
          key={col.key}
          value={comparison[col.key].value}
          result={comparison[col.key].result}
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
        <p className={styles.answerReveal}>
          Today's brawler was <strong>{answer?.name}</strong>
        </p>

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
  const [guesses, setGuesses] = useState([]); // array of comparison objects
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

  const inputRef = useRef(null);

  // ── Auth on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const u = await authenticateWithDiscord();
      if (u) {
        setUser(u);
        setAuthLoading(false);
      }
      // if null, we redirected — component will unmount
    })();
  }, []);

  // ── Load game state once authenticated ────────────────────────────────────
  //   useEffect(() => {
  //     if (!user) return;
  //     loadGameState();
  //   }, [user]);

  useEffect(() => {
    if (!user) return;

    // Grab guild/channel from the Discord SDK URL params (only present in Activity)
    const params = new URLSearchParams(window.location.search);
    const guildId = params.get("guild_id");
    const channelId = params.get("channel_id");

    // Only call start-session if we're inside the Discord Activity
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
      setGuesses(res.data.guesses || []);
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

  // ── Autocomplete ───────────────────────────────────────────────────────────
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
      (name) =>
        name.toLowerCase().includes(val.toLowerCase()) &&
        !guessedNames.includes(name.toLowerCase()),
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
      const name =
        selectedIdx >= 0 ? suggestions[selectedIdx] : suggestions[0] || input;
      if (name) submitGuess(name);
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Connecting to Discord…</div>
      </div>
    );
  }

  if (gameLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading today's game…</div>
      </div>
    );
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
                {suggestions.map((name, i) => (
                  <li
                    key={name}
                    className={`${styles.suggestion} ${i === selectedIdx ? styles.selectedSuggestion : ""}`}
                    onMouseDown={() => submitGuess(name)}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            className={styles.guessBtn}
            onClick={() => {
              const name = suggestions[0] || input;
              if (name) submitGuess(name);
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

          {guesses.map((comparison, i) => (
            <GuessRow
              key={i}
              comparison={comparison}
              brawlerName={comparison.name?.value}
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

const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const CELL_SIZE = 48;
const CELL_GAP = 6;
const COLS = 7; // name + 6 attributes
const PADDING = 24;
const AVATAR_SIZE = 64;
const TITLE_HEIGHT = 48;
const CONTENT_HEIGHT = 36;

const GREEN = "#1a4d1a";
const GREEN_BORDER = "#2e7d2e";
const RED = "#4d1a1a";
const RED_BORDER = "#7d2e2e";
const BG = "#0d0d0d";
const SURFACE = "#1a1a1a";
const TEXT = "#f0f0f0";
const SUBTEXT = "#888888";
const GOLD = "#ffd700";

async function generateBrawldleImage({
  userId,
  username,
  avatarUrl,
  guesses, // array of comparison objects from DB
  brawldleNumber,
  won,
}) {
  const rows = guesses.length;
  const gridWidth = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP;
  const gridHeight =
    rows > 0 ? rows * CELL_SIZE + (rows - 1) * CELL_GAP : CELL_SIZE;

  const canvasWidth = Math.max(gridWidth + PADDING * 2, 400);
  const canvasHeight =
    PADDING +
    TITLE_HEIGHT +
    PADDING +
    AVATAR_SIZE +
    PADDING +
    gridHeight +
    PADDING +
    CONTENT_HEIGHT +
    PADDING;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // ── Background ────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ── Title ─────────────────────────────────────────────────────
  ctx.fillStyle = GOLD;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Brawldle #${brawldleNumber}`, canvasWidth / 2, PADDING + 32);

  // ── Avatar ────────────────────────────────────────────────────
  const avatarY = PADDING + TITLE_HEIGHT + PADDING;
  try {
    const avatarData = await axios.get(avatarUrl, {
      responseType: "arraybuffer",
    });
    const avatarImg = await loadImage(Buffer.from(avatarData.data));

    const cx = canvasWidth / 2;
    const cy = avatarY + AVATAR_SIZE / 2;
    const r = AVATAR_SIZE / 2;

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, cx - r, cy - r, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();

    // Border ring
    ctx.strokeStyle = won ? GREEN_BORDER : SUBTEXT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.stroke();
  } catch (_) {
    // Avatar failed — draw placeholder circle
    ctx.fillStyle = SURFACE;
    ctx.beginPath();
    ctx.arc(
      canvasWidth / 2,
      avatarY + AVATAR_SIZE / 2,
      AVATAR_SIZE / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // ── Guess grid (blacked out — no labels, no values) ───────────
  const gridStartX = (canvasWidth - gridWidth) / 2;
  const gridStartY = avatarY + AVATAR_SIZE + PADDING;

  if (rows === 0) {
    // No guesses yet — show placeholder row
    for (let c = 0; c < COLS; c++) {
      const x = gridStartX + c * (CELL_SIZE + CELL_GAP);
      roundRect(ctx, x, gridStartY, CELL_SIZE, CELL_SIZE, 6, SURFACE, "#333");
    }
  } else {
    for (let r = 0; r < rows; r++) {
      const comparison = guesses[r];
      const y = gridStartY + r * (CELL_SIZE + CELL_GAP);
      const results = extractResults(comparison);

      for (let c = 0; c < COLS; c++) {
        const x = gridStartX + c * (CELL_SIZE + CELL_GAP);
        const result = results[c];
        const isCorrect = result === "correct";
        const bg = isCorrect ? GREEN : RED;
        const border = isCorrect ? GREEN_BORDER : RED_BORDER;
        roundRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 6, bg, border);
      }
    }
  }

  // ── Bottom content (username) ─────────────────────────────────
  const contentY = gridStartY + gridHeight + PADDING + 20;
  ctx.fillStyle = won ? GOLD : TEXT;
  ctx.font = `${won ? "bold " : ""}16px sans-serif`;
  ctx.textAlign = "center";
  const statusText = won
    ? `${username} solved it in ${rows} ${rows === 1 ? "guess" : "guesses"}!`
    : `${username} is playing…`;
  ctx.fillText(statusText, canvasWidth / 2, contentY);

  return canvas.toBuffer("image/png");
}

// Extract results in column order: name, rarity, class, movement, range, reload, release
function extractResults(comparison) {
  return [
    comparison.name?.result,
    comparison.rarity?.result,
    comparison.class?.result,
    comparison.movement?.result,
    comparison.range?.result,
    comparison.reload?.result,
    comparison.release?.result,
  ];
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

module.exports = { generateBrawldleImage };

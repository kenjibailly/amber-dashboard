const { createCanvas, loadImage, registerFont } = require("canvas");
const axios = require("axios");
const path = require("path");

try {
  registerFont(path.join(__dirname, "../assets/fonts/Segoe-UI.ttf"), {
    family: "SegoeUI",
    weight: "normal",
  });
  registerFont(path.join(__dirname, "../assets/fonts/Segoe-UI-Bold.ttf"), {
    family: "SegoeUIBold",
    weight: "bold",
  });
  registerFont(
    path.join(__dirname, "../assets/fonts/Segoe-UI-Bold-Black.ttf"),
    {
      family: "SegoeUIBoldBlack",
      weight: "bold",
    },
  );
} catch (_) {
  // Font files not found — canvas will fall back to sans-serif
}

const CELL_SIZE = 48;
const CELL_GAP = 6;
const COLS = 7; // name + 6 attributes
const PADDING = 24;
const AVATAR_SIZE = 96; // bigger avatar
const TITLE_HEIGHT = 48;
const CONTENT_HEIGHT = 36;

const BG = "#0e0e0a";
const SURFACE = "#1a1a1a";
const TEXT = "#f0f0f0";
const SUBTEXT = "#888888";
const GOLD = "#ffd700";

const GREEN_START = "#2da660";
const GREEN_END = "#178029";
const GREEN_BORDER = "#2e7d2e";
const RED_START = "#a62d46";
const RED_END = "#801717";
const RED_BORDER = "#7d2e2e";

// Strip emojis and other non-canvas-renderable characters
function stripEmojis(str) {
  return str
    .replace(
      /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F9FF}]|[\u{1FA00}-\u{1FA9F}]|[\u{2300}-\u{23FF}]|[\u{2B50}\u{2B55}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E0}-\u{1F1FF}]/gu,
      "",
    )
    .trim();
}

async function generateBrawldleImage({
  userId,
  username,
  avatarUrl,
  guesses,
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
  ctx.font = "bold 28px SegoeUIBoldBlack, sans-serif";
  ctx.textAlign = "left"; // must be left for manual positioning
  fillTextWithSpacing(
    ctx,
    `Brawldle #${brawldleNumber}`,
    canvasWidth / 2,
    PADDING + 32,
    -1,
  );

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

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, cx - r, cy - r, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();

    ctx.strokeStyle = won ? GREEN_BORDER : SUBTEXT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.stroke();
  } catch (_) {
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

  // ── Guess grid ────────────────────────────────────────────────
  const gridStartX = (canvasWidth - gridWidth) / 2;
  const gridStartY = avatarY + AVATAR_SIZE + PADDING;

  if (rows === 0) {
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

        const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y);
        if (isCorrect) {
          gradient.addColorStop(0, GREEN_START);
          gradient.addColorStop(1, GREEN_END);
        } else {
          gradient.addColorStop(0, RED_START);
          gradient.addColorStop(1, RED_END);
        }

        const border = isCorrect ? GREEN_BORDER : RED_BORDER;
        roundRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 6, gradient, border);
      }
    }
  }

  // ── Bottom content (username) ─────────────────────────────────
  const contentY = gridStartY + gridHeight + PADDING + 20;
  ctx.fillStyle = won ? GOLD : TEXT;
  ctx.font = `${won ? "bold " : ""}16px Segoe, sans-serif`;
  ctx.textAlign = "center";
  const cleanUsername = stripEmojis(username);
  const statusText = won
    ? `${cleanUsername} solved it in ${rows} ${rows === 1 ? "guess" : "guesses"}!`
    : `${cleanUsername} is playing…`;
  ctx.fillText(statusText, canvasWidth / 2, contentY);

  return canvas.toBuffer("image/png");
}

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

function fillTextWithSpacing(ctx, text, x, y, letterSpacing) {
  const chars = text.split("");
  const totalWidth =
    chars.reduce((w, ch) => w + ctx.measureText(ch).width + letterSpacing, 0) -
    letterSpacing;
  let currentX = x - totalWidth / 2; // center it
  for (const ch of chars) {
    ctx.fillText(ch, currentX, y);
    currentX += ctx.measureText(ch).width + letterSpacing;
  }
}

module.exports = { generateBrawldleImage };

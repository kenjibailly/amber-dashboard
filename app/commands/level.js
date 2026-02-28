const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const Levels = require("../models/Levels");
const LevelConfig = require("../models/GuildModule");
const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

// Constants
const WIDTH = 800;
const HEIGHT = 300;
const RADIUS = 20;

const levelGradients = [
  { min: 0, max: 10, colors: ["#FFD445", "#FF5757"] },
  { min: 11, max: 20, colors: ["#DD45FF", "#FF5757"] },
  { min: 21, max: 30, colors: ["#DD45FF", "#57D2FF"] },
  { min: 31, max: 40, colors: ["#45FF77", "#57D2FF"] },
  { min: 41, max: 50, colors: ["#45FF77", "#BC57FF"] },
  { min: 51, max: 60, colors: ["#57D2FF", "#FF8A45"] },
  { min: 61, max: 70, colors: ["#FF8A45", "#FFA3FF"] },
  { min: 71, max: 80, colors: ["#FFA3FF", "#57FFB4"] },
  { min: 81, max: 90, colors: ["#57FFB4", "#FF57A1"] },
  { min: 91, max: 100, colors: ["#FF57A1", "#FFD445"] },
];

module.exports = {
  calculateLevel,
  calculateExp,
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Check out your current level")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Select a user to see their level")
        .setRequired(false),
    ),

  // Called as slash command: execute(interaction)
  // Called as level up notification: execute(null, client, userId, null, guildId)
  async execute(interaction, client, userId, _message, guildId) {
    const isSlashCommand = !!interaction;
    const resolvedClient = isSlashCommand ? interaction.client : client;

    try {
      registerFont("./introduction/fonts/Nougat-ExtraBlack.ttf", {
        family: "Nougat",
        weight: "bold",
      });

      if (isSlashCommand) {
        await interaction.deferReply();
      }

      const resolvedGuildId = isSlashCommand ? interaction.guildId : guildId;
      const resolvedUserId = isSlashCommand
        ? interaction.options.getUser("user")?.id || interaction.user.id
        : userId;

      let config = await LevelConfig.findOne({
        guildId: resolvedGuildId,
        moduleId: "level",
      });

      if (!config || !config.enabled) {
        if (isSlashCommand) {
          const errorEmbed = new EmbedBuilder()
            .setTitle("Level System Not Configured")
            .setDescription(
              "This server has not configured its level system yet.",
            )
            .setColor("Red");
          return interaction.editReply({ embeds: [errorEmbed], flags: 64 });
        }
        return;
      }

      config = config.settings;

      let userLevel = await Levels.findOne({
        guildId: resolvedGuildId,
        userId: resolvedUserId,
      });

      if (!userLevel) {
        userLevel = await Levels.create({
          guildId: resolvedGuildId,
          userId: resolvedUserId,
          messageCount: 0,
        });
      }

      const level = calculateLevel(userLevel.messageCount, config);
      const { exp, next_level_exp, exp_percentage } = calculateExp(
        userLevel.messageCount,
        config,
      );

      const canvas = await drawBackground(level);
      const ctx = canvas.getContext("2d");
      await drawProfile(ctx, resolvedClient, resolvedUserId);

      // Get display name
      let displayName;
      try {
        const userObj = await resolvedClient.users
          .fetch(resolvedUserId)
          .catch(() => null);
        displayName = (
          userObj?.globalName ||
          userObj?.username ||
          "UNKNOWN USER"
        ).toUpperCase();
      } catch {
        displayName = "UNKNOWN USER";
      }

      drawText(ctx, displayName, 24, 142, 29 + 15, 2, 4);
      drawText(
        ctx,
        "LEVEL " + level,
        24,
        142,
        58 + 15,
        2,
        4,
        "left",
        getGradientColors(level),
      );
      drawText(
        ctx,
        exp + "/" + next_level_exp + " EXP",
        13,
        132 + 250,
        77 + 15,
        1,
        1,
        "right",
      );
      await drawExpBar(ctx, exp_percentage, getGradientColors(level));
      await drawRewards(ctx, level, config);

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, {
        name: "level-card.png",
      });

      if (isSlashCommand) {
        // Slash command: reply to the interaction
        await interaction.editReply({ files: [attachment] });
      } else {
        // Level up notification: post to configured channel
        const targetChannel = await resolvedClient.channels
          .fetch(config.channelId)
          .catch(() => null);

        if (!targetChannel) {
          console.error("Level up channel not found:", config.channelId);
          return;
        }

        await targetChannel.send({
          content: `🎉 <@${resolvedUserId}> leveled up to level ${level}!`,
          files: [attachment],
        });
      }
    } catch (err) {
      console.error("level execute error:", err);
      if (isSlashCommand) {
        try {
          await interaction.editReply({ content: "Something went wrong." });
        } catch {}
      }
    }
  },
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius,
  fillStyle = undefined,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
}

function getGradientColors(level) {
  for (const range of levelGradients) {
    if (level >= range.min && level <= range.max) {
      return range.colors;
    }
  }
  return ["#45FF77", "#BC57FF"];
}

async function drawBackground(level) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, RADIUS);
  ctx.clip();

  const [startColor, endColor] = getGradientColors(level);
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const patternPath = path.join(__dirname, "../level/assets/pattern.png");
  const patternImg = await loadImage(patternPath);
  ctx.globalAlpha = 0.15;
  ctx.drawImage(patternImg, 0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;

  return canvas;
}

async function drawProfile(ctx, resolvedClient, userId) {
  const img_width = 107;
  const img_height = 122;
  const image = await loadImage("./introduction/assets/pfp-star.png");
  ctx.save();
  ctx.scale(2, 2);
  ctx.drawImage(image, 14, 14, img_width, img_height);
  ctx.restore();

  const imgSize = 73;
  let imageURL;

  try {
    const userObj = await resolvedClient.users.fetch(userId).catch(() => null);
    if (userObj) {
      imageURL = userObj.displayAvatarURL({ extension: "png", size: 512 });
    }
  } catch {}

  if (!imageURL) return;

  try {
    const image = await loadImage(imageURL);
    const x = 31;
    const y = 39;

    ctx.save();
    ctx.scale(2, 2);
    ctx.beginPath();
    ctx.arc(x + imgSize / 2, y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, imgSize, imgSize);
    ctx.restore();

    ctx.save();
    ctx.scale(2, 2);
    ctx.beginPath();
    ctx.arc(x + imgSize / 2, y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
    ctx.arc(
      x + imgSize / 2 + 2,
      y + imgSize / 2 + 2,
      imgSize / 2 - 2,
      0,
      Math.PI * 2,
      true,
    );
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();
    ctx.restore();
  } catch (err) {
    console.error("Failed to load profile image:", err);
  }
}

function drawText(
  ctx,
  value,
  size,
  posx,
  posy,
  shadowoffset,
  lineWidth,
  align = "left",
  gradient,
) {
  if (!value) return;
  ctx.save();
  ctx.scale(2, 2);
  ctx.font = size + 'px "Nougat"';
  ctx.strokeStyle = "black";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadowoffset;
  ctx.lineWidth = lineWidth;
  ctx.textAlign = align;

  if (Array.isArray(gradient) && gradient.length === 2) {
    const textWidth = ctx.measureText(value).width;
    const grad = ctx.createLinearGradient(posx, posy, posx + textWidth, posy);
    grad.addColorStop(0, gradient[1]);
    grad.addColorStop(1, gradient[0]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = "#ffffff";
  }

  ctx.strokeText(`${value}`, posx, posy);
  ctx.fillText(`${value}`, posx, posy);
  ctx.restore();
}

function calculateLevel(messageCount, config) {
  return Math.floor(messageCount / parseInt(config.messageCount || 1));
}

function calculateExp(messageCount, config) {
  const msgCount = parseInt(config.messageCount) || 1;
  const expPoints = parseInt(config.expPoints) || 100;

  const level = messageCount / msgCount;
  const exp = Math.round(level * expPoints);
  const flooredLevel = Math.floor(level);

  const current_level_exp = flooredLevel * expPoints;
  const next_level_exp = (flooredLevel + 1) * expPoints;
  const exp_into_current_level = exp - current_level_exp;
  const exp_needed_for_next_level = next_level_exp - current_level_exp;

  const exp_percentage = Math.min(
    100,
    Math.max(0, (exp_into_current_level / exp_needed_for_next_level) * 100),
  );
  return { level, exp, next_level_exp, exp_percentage };
}

async function drawExpBar(ctx, exp_percentage, gradientColors) {
  const ypos = 95;
  ctx.scale(2, 2);

  drawRoundedRect(ctx, 132, ypos, 250, 10, 5, "#2D2D2D");

  const progressWidth = (exp_percentage / 100) * 246;
  if (progressWidth <= 0) return;

  const gradient = ctx.createLinearGradient(134 + progressWidth, 92, 134, 92);
  gradient.addColorStop(0, gradientColors[0]);
  gradient.addColorStop(1, gradientColors[1]);

  drawRoundedRect(ctx, 134, ypos + 2, progressWidth, 6, 5, gradient);
}

async function drawRewards(ctx, level, config) {
  const spacing = 2;
  const startX = 365;
  let drewMainReward = false;

  if (config.reward && config.reward > 0) {
    const totalCoins = Math.floor(level / config.reward);
    if (totalCoins > 0) {
      const coinImage = await loadImage("./level/assets/coin.png");
      const coinSize = 15;
      const y = 110;
      const maxCoins = 13;
      const coinsToDraw = Math.min(totalCoins, maxCoins);

      for (let i = 0; i < coinsToDraw; i++) {
        const x = startX - i * (coinSize + spacing);
        ctx.drawImage(coinImage, x, y, coinSize, coinSize);
      }

      if (totalCoins > maxCoins) {
        const leftMostX = startX - (coinsToDraw - 1) * (coinSize + spacing);
        drawText(
          ctx,
          `${totalCoins}`,
          8,
          (leftMostX - 5) / 2,
          (y + 12) / 2,
          1,
          1,
          "right",
        );
      }

      drewMainReward = true;
    }
  }

  if (config.rewardExtra && config.rewardExtra > 0) {
    const totalExtras = Math.floor(level / config.rewardExtra);
    if (totalExtras > 0) {
      const extraImage = await loadImage("./level/assets/reward_extra.png");
      const extraSize = 20;
      const y = drewMainReward ? 125 : 105;
      const maxExtras = 10;
      const extrasToDraw = Math.min(totalExtras, maxExtras);

      for (let i = 0; i < extrasToDraw; i++) {
        const x = startX - i * (extraSize + spacing) - 5;
        ctx.drawImage(extraImage, x, y, extraSize, extraSize);
      }

      if (totalExtras > maxExtras) {
        const leftMostX = startX - (extrasToDraw - 1) * (extraSize + spacing);
        drawText(
          ctx,
          `${totalExtras}`,
          8,
          (leftMostX - 10) / 2,
          (y + 15) / 2,
          1,
          1,
          "right",
        );
      }
    }
  }
}

const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const Levels = require("../models/Levels");
const LevelConfig = require("../models/GuildModule");
const { calculateLevel } = require("./level");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the leaderboard"),

  async execute(interaction) {
    await interaction.deferReply();

    let levelConfig;
    try {
      levelConfig = await LevelConfig.findOne({
        guildId: interaction.guildId,
        moduleId: "level",
      });

      if (!levelConfig?.enabled) {
        const embed = new EmbedBuilder()
          .setTitle("Leaderboard")
          .setDescription("Level system is disabled on this server.")
          .setColor("Red");

        return await interaction.editReply({ embeds: [embed], flags: 64 });
      }

      levelConfig = levelConfig.settings;
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("Leaderboard")
        .setDescription("Something went wrong, please try again later.")
        .setColor("Red");

      return await interaction.editReply({ embeds: [embed], flags: 64 });
    }

    registerFont("./introduction/fonts/Nougat-ExtraBlack.ttf", {
      family: "Nougat", // This name must match what you'll use in ctx.font
      weight: "bold", // Optional: helps with clarity
    });
    registerFont("./introduction/fonts/NotoSansCJKjp-Regular.otf", {
      family: "Noto Sans CJK JP",
    });

    // Canvas settings
    const offsetTop = 84;
    const offsetBottom = 88;
    const offsetSide = 23;
    const width = 850;
    const height = 952;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawBackground(
      ctx,
      width,
      height,
      offsetTop,
      offsetBottom,
      offsetSide,
    );
    await drawText(
      ctx,
      "LEADERBOARD",
      50,
      40,
      height / 2,
      2,
      "center",
      360 - 90,
    );
    await drawText(
      ctx,
      "LEADERBOARD",
      50,
      width - offsetSide * 2 + 5,
      height / 2,
      2,
      "center",
      90,
    );
    await drawLogo(ctx, width, height);
    await drawClouds(ctx, width);
    await drawTrophy(ctx, width);

    // Get top 11 levels
    const levels = await Levels.find({ guildId: interaction.guildId })
      .sort({ messageCount: -1 })
      .limit(11);

    const users = await Promise.all(
      levels.map(async (lvl) => {
        try {
          const user = await interaction.client.users.fetch(lvl.userId);
          return {
            userId: lvl.userId,
            username: user.username,
            avatar: user.displayAvatarURL({ extension: "png", size: 512 }),
            messageCount: lvl.messageCount,
            level: calculateLevel(lvl.messageCount, levelConfig),
          };
        } catch (err) {
          console.error(`Failed to fetch user ${lvl.userId}`, err);
          return {
            userId: lvl.userId,
            username: "Unknown",
            avatar: null,
            messageCount: lvl.messageCount,
          };
        }
      }),
    );

    // Draw number 1
    await drawText(ctx, "1", 50, width / 2, 193, 2, "center", 0, "#F21200");
    await drawProfile(ctx, offsetTop, users[0], interaction, width / 2, 205);
    await drawText(ctx, users[0].level, 40, width / 2, 365, 2, "center", 0);

    if (users.length > 1) {
      // Draw number 2
      await drawText(
        ctx,
        "2",
        50,
        width / 3 - 10,
        230,
        2,
        "center",
        0,
        "#F21200",
      );
      await drawProfile(
        ctx,
        offsetTop,
        users[1],
        interaction,
        width / 3 - 10,
        245,
      );
      await drawText(
        ctx,
        users[1].level,
        40,
        width / 3 - 10,
        405,
        2,
        "center",
        0,
      );
    }

    if (users.length > 2) {
      // Draw number 3
      await drawText(
        ctx,
        "3",
        50,
        (width / 3) * 2 + 10,
        230,
        2,
        "center",
        0,
        "#F21200",
      );
      await drawProfile(
        ctx,
        offsetTop,
        users[2],
        interaction,
        (width / 3) * 2 + 10,
        245,
      );
      await drawText(
        ctx,
        users[2].level,
        40,
        (width / 3) * 2 + 10,
        405,
        2,
        "center",
        0,
      );
    }

    // Draw rounded background rectangle
    ctx.save();
    roundRect(ctx, 117, 473, 623, 290, 20);
    ctx.fillStyle = "#ffffff"; // Set this to your desired fill
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.restore();

    if (users.length > 4) {
      for (let index = 0; index < 8; index++) {
        if (index < 4) {
          const number = index + 4;
          const numberString = number.toString();
          await drawText(
            ctx,
            numberString,
            30,
            150,
            525 + index * 68,
            2,
            "center",
            0,
            "#F21200",
          );
          await drawProfile(
            ctx,
            offsetTop,
            users[index + 3],
            interaction,
            117 + 100,
            485 + index * 68,
            0.5,
          );
          await drawText(ctx, "Lvl", 30, 260, 525 + index * 68, 2);
          await drawText(
            ctx,
            users[index + 3].level,
            30,
            310,
            525 + index * 68,
            2,
          );
        } else if (index >= 4) {
          const number = index + 4;
          const numberString = number.toString();
          await drawText(
            ctx,
            numberString,
            30,
            width / 2 + 25,
            525 + (index - 4) * 68,
            2,
            "center",
            0,
            "#F21200",
          );
          await drawProfile(
            ctx,
            offsetTop,
            users[index + 3],
            interaction,
            width / 2 + 100,
            485 + (index - 4) * 68,
            0.5,
          );
          await drawText(
            ctx,
            "Lvl",
            30,
            width / 2 + 140,
            525 + (index - 4) * 68,
            2,
          );
          await drawText(
            ctx,
            users[index + 3].level,
            30,
            width / 2 + 190,
            525 + (index - 4) * 68,
            2,
          );
        }
      }
    }

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, {
      name: "leaderboard.png",
    });

    try {
      const leaderboardString = users
        .map((u, index) => `${index + 1}. <@${u.userId}>: level **${u.level}**`)
        .join("\n");

      await interaction.editReply({
        content: `# 🏆 Leaderboard \n\n` + leaderboardString,
        files: [attachment],
      });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("Leaderboard")
        .setDescription("Something went wrong, please try again later.")
        .setColor("Red");
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

function drawText(
  ctx,
  value,
  size,
  posx,
  posy,
  shadowoffset,
  align = "left",
  rotation = 0, // in degrees
  color = "#ffffff", // new param
) {
  if (!value) return;
  ctx.save();

  ctx.font = size + 'px "Nougat"';

  ctx.strokeStyle = "black";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadowoffset;

  ctx.fillStyle = color; // use parameter
  ctx.lineWidth = 4;
  ctx.textAlign = align;

  // Move origin to text position
  ctx.translate(posx, posy);
  // Convert degrees → radians for canvas
  ctx.rotate((rotation * Math.PI) / 180);

  // Draw text relative to new origin
  ctx.strokeText(`${value}`, 0, 0);
  ctx.fillText(`${value}`, 0, 0);

  ctx.restore();
}

async function drawBackground(
  ctx,
  width,
  height,
  offsetTop,
  offsetBottom,
  offsetSide,
) {
  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#FFD445"); // Light blue
  gradient.addColorStop(1, "#FF5757"); // Dark blue

  // Dimensions
  const rectX = offsetSide;
  const rectY = offsetTop;
  const rectWidth = width - offsetSide * 2;
  const rectHeight = height - offsetTop - offsetBottom;
  const borderRadius = 22;

  // Draw rounded background rectangle
  ctx.save();
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
  ctx.fillStyle = gradient; // Set this to your desired fill
  ctx.fill();
  ctx.restore();

  // Draw rounded pattern image over it with opacity
  const image = await loadImage("./leaderboard/pattern.png");
  ctx.save();
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
  ctx.clip(); // Apply rounded clipping path
  ctx.drawImage(image, rectX, rectY, rectWidth, rectHeight);
  ctx.restore();
}

// Rounded rectangle helper
function roundRect(ctx, x, y, width, height, radius) {
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
}

async function drawLogo(ctx, width, height) {
  const img_width = 330;
  const img_height = 163;
  const image = await loadImage("./leaderboard/logo.png");
  ctx.save();
  ctx.drawImage(
    image,
    width / 2 - img_width / 2,
    height - img_height,
    img_width,
    img_height,
  );
  ctx.restore();
}

async function drawTrophy(ctx, width) {
  const img_width = 191;
  const img_height = 142;
  const image = await loadImage("./leaderboard/trophy.png");
  ctx.save();
  ctx.drawImage(image, width / 2 - img_width / 2, 0, img_width, img_height);
  ctx.restore();
}

async function drawClouds(ctx, width) {
  const img_width = 789;
  const img_height = 369;
  const image = await loadImage("./leaderboard/clouds.png");
  ctx.save();
  ctx.drawImage(image, width / 2 - img_width / 2, 127, img_width, img_height);
  ctx.restore();
}

async function drawProfile(
  ctx,
  offset,
  profile,
  interaction,
  xpos,
  ypos,
  scale = 1,
) {
  const img_width = 107;
  const img_height = 122;

  xpos = xpos - (img_width / 2) * scale;

  // Decorative star frame
  const starFrame = await loadImage("./introduction/assets/pfp-star.png");

  ctx.save();
  ctx.translate(xpos, ypos); // move origin to drawing position
  ctx.scale(scale, scale); // apply scaling

  ctx.drawImage(starFrame, 0, 0, img_width, img_height);

  const imgSize = 73;
  let imageURL;

  if (profile && profile.avatar) {
    imageURL = profile.avatar;
  } else {
    imageURL = interaction.user.displayAvatarURL({
      extension: "png",
      size: 512,
    });
  }

  try {
    const avatarImg = await loadImage(imageURL);

    const x = 17;
    const y = 25;

    // Step 1: Draw circular clipped avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + imgSize / 2, y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, x, y, imgSize, imgSize);
    ctx.restore();

    // Step 2: Draw crescent-shaped inner shadow
    ctx.save();
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
    console.error("Failed to load avatar:", err);
  }

  ctx.restore(); // restore after scale + translate
}

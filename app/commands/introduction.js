const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { AttachmentBuilder, ChannelType } = require("discord.js");
const game = require("../introduction/game.json");
const characterNames = game.characters.map((c) => c.name);
const countries = require("../introduction/countries.json");
const Introductions = require("../models/Introductions");
const IntroductionConfig = require("../models/GuildModule");
let error = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("introduction")
    .setDescription("Create your introduction")

    .addStringOption((option) =>
      option
        .setName("gamertag")
        .setDescription("Your in-game name")
        .setRequired(true),
    )

    .addIntegerOption((option) =>
      option.setName("age").setDescription("Your age").setRequired(true),
    )

    .addStringOption((option) =>
      option
        .setName("country")
        .setDescription("Your country")
        .setRequired(true)
        .setAutocomplete(true),
    )

    .addStringOption((option) =>
      option
        .setName("occupation")
        .setDescription("Your occupation")
        .setRequired(true),
    )

    .addStringOption((option) =>
      option
        .setName("hobbies")
        .setDescription("Your hobbies")
        .setRequired(true),
    )

    .addStringOption((option) =>
      option
        .setName("favorite_character")
        .setDescription("Your favorite character")
        .setRequired(true)
        .setAutocomplete(true),
    )

    .addStringOption((option) =>
      option
        .setName("game_goal")
        .setDescription("Your goal in the game")
        .setRequired(true),
    )

    .addStringOption((option) =>
      option
        .setName("about_me")
        .setDescription("Tell us about yourself")
        .setRequired(true),
    )

    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Your real name")
        .setRequired(false),
    )

    .addAttachmentOption((option) =>
      option
        .setName("picture")
        .setDescription("Upload a picture of yourself")
        .setRequired(false),
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "country") {
      const filtered = countries
        .filter((country) =>
          country.name
            .toLowerCase()
            .includes(focusedOption.value.toLowerCase()),
        )
        .slice(0, 25);

      return interaction.respond(
        filtered.map((country) => ({
          name: country.name,
          value: country.name,
        })),
      );
    }

    if (focusedOption.name === "favorite_character") {
      const filtered = characterNames
        .filter((name) =>
          name.toLowerCase().includes(focusedOption.value.toLowerCase()),
        )
        .slice(0, 25);

      return interaction.respond(
        filtered.map((name) => ({
          name,
          value: name,
        })),
      );
    }
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    error = false;
    // Extract IDs
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    let introductionConfig;
    try {
      introductionConfig = await IntroductionConfig.findOne({
        guildId,
        moduleId: "intro",
      });
      if (!introductionConfig.enabled) {
        const embed = new EmbedBuilder()
          .setTitle("Introduction")
          .setDescription("Introductions have been disabled for this server.")
          .setColor("Red");
        return await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error(error);
      const embed = new EmbedBuilder()
        .setTitle("Introduction")
        .setDescription("❌ Something went wrong, please try again later.")
        .setColor("Red");
      return await interaction.editReply({ embeds: [embed] });
    }
    registerFont("./introduction/fonts/Nougat-ExtraBlack.ttf", {
      family: "Nougat", // This name must match what you'll use in ctx.font
      weight: "bold", // Optional: helps with clarity
    });
    registerFont("./introduction/fonts/NotoSansCJKjp-Regular.otf", {
      family: "Noto Sans CJK JP",
    });
    const gamertag = interaction.options.getString("gamertag");
    const name = interaction.options.getString("name");
    const age = interaction.options.getInteger("age");
    const country = interaction.options.getString("country");
    const occupation = interaction.options.getString("occupation");
    const hobbies = interaction.options.getString("hobbies");
    const favoriteCharacter =
      interaction.options.getString("favorite_character");
    const picture = interaction.options.getAttachment("picture");
    const gameGoal = interaction.options.getString("game_goal");
    const about_me = interaction.options.getString("about_me");

    // Canvas settings
    const offset = 82;
    const width = 900;
    const height = 767;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawBackground(ctx, width, height, offset, favoriteCharacter);
    await drawFavoriteCharacter(ctx, width, height, offset, favoriteCharacter);
    await drawSecondBackground(ctx, width, height, offset, favoriteCharacter);
    await drawBigBreak(ctx);
    await drawLogo(ctx, width);
    await drawGamerTag(ctx, offset, gamertag, name);
    await drawProfile(ctx, offset, picture, interaction);
    await drawAge(ctx, age, offset);
    await drawCountry(ctx, country, offset);
    await drawBreak(ctx, offset);
    await drawTextBox(
      ctx,
      hobbies,
      "MY HOBBIES ARE:",
      offset,
      383,
      420 + offset,
      "hobbies",
      interaction,
    );
    await drawTextBox(
      ctx,
      occupation,
      "MY OCCUPATION:",
      offset,
      383 + 250,
      420 + offset,
      "occupation",
      interaction,
    );
    await drawTextBox(
      ctx,
      gameGoal,
      "MY GOAL IN GAME:",
      offset,
      383,
      460 + 100 + offset,
      "game goal",
      interaction,
    );
    await drawTextBox(
      ctx,
      about_me,
      "MORE ABOUT ME:",
      offset,
      383 + 250,
      460 + 100 + offset,
      "about me",
      interaction,
    );

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, {
      name: "introduction.png",
    });

    if (error) return;

    // Check for existing introduction
    const existingIntro = await Introductions.findOne({
      guildId,
      userId,
    });

    let message;

    try {
      if (!existingIntro) {
        let targetChannel;
        if (introductionConfig.settings?.channelId) {
          // Attempt to fetch the configured channel
          targetChannel = await interaction.guild.channels
            .fetch(introductionConfig.settings.channelId)
            .catch(() => null);
        } else {
          // Attempt to fetch the configured channel
          targetChannel = await interaction.guild.channels
            .fetch(interaction.channelId)
            .catch(() => null);
        }

        // No config or missing channel: fallback to replying directly
        if (!introductionConfig || !introductionConfig.settings.channelId) {
          // Defer reply once at the top
          // await interaction.deferReply();
          message = await targetChannel.send({
            content: `📢 <@${userId}> has introduced themselves!`,
            files: [attachment],
          });
          await Introductions.findOneAndUpdate(
            { guildId, userId },
            { messageId: message.id, channelId: interaction.channel.id },
            { upsert: true },
          );
          return;
        }

        if (targetChannel) {
          try {
            message = await targetChannel.send({
              content: `📢 <@${userId}> has introduced themselves!`,
              files: [attachment],
            });

            const embed = new EmbedBuilder()
              .setTitle("Introduction")
              .setDescription(
                `✅ Your introduction has been sent to <#${introductionConfig.settings.channelId}> !`,
              )
              .setColor("Green");
            // Defer reply once at the top
            // await interaction.deferReply({ flags: 64 });
            await interaction.editReply({ embeds: [embed] });

            await Introductions.findOneAndUpdate(
              { guildId, userId },
              {
                messageId: message.id,
                channelId:
                  introductionConfig.settings.channelId ||
                  interaction.channelId,
              },
              { upsert: true },
            );
          } catch (err) {
            logger.error("Failed to send intro to configured channel:", err);
            const embed = new EmbedBuilder()
              .setTitle("Introduction")
              .setDescription(
                "❌ Couldn't send the message in the configured channel. Please contact an admin.",
              )
              .setColor("Red");
            await interaction.editReply({ embeds: [embed] });
          }
        } else {
          const embed = new EmbedBuilder()
            .setTitle("Introduction")
            .setDescription(
              "❌ Configured channel could not be found. Please contact an admin.",
            )
            .setColor("Red");
          await interaction.editReply({ embeds: [embed] });
        }
      } else {
        // Updating existing intro
        try {
          const channel = await interaction.client.channels.fetch(
            existingIntro.channelId,
          );
          const oldMessage = await channel.messages.fetch(
            existingIntro.messageId,
          );

          await oldMessage.edit({
            content: `📢 <@${userId}> has introduced themselves (updated)!`,
            files: [attachment],
          });

          const embed = new EmbedBuilder()
            .setTitle("Introduction")
            .setDescription("✅ Your introduction has been updated!")
            .setColor("Green");
          try {
            // Defer reply once at the top
            // await interaction.deferReply({ flags: 64 });
            await interaction.editReply({ embeds: [embed] });
          } catch (error) {
            logger.error(error);
          }
        } catch (error) {
          logger.error("Failed to edit previous introduction message:", error);

          const embed = new EmbedBuilder()
            .setTitle("Introduction")
            .setDescription(
              "⚠️ Failed to update your existing introduction. Please try again.",
            )
            .setColor("Red");

          await interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (error) {
      logger.error("Introduction handler error:", error);

      const embed = new EmbedBuilder()
        .setTitle("Introduction")
        .setDescription(
          "❌ An unexpected error occurred. Please try again later.",
        )
        .setColor("Red");

      // Best effort: safe fallback
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  },
};

function drawText(ctx, value, size, posx, posy, shadowoffset, align = "left") {
  if (!value) return;

  ctx.save();
  ctx.strokeStyle = "black";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadowoffset;
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic"; // Match original behavior

  let currentX = posx;

  // 🔍 Add this log before adjusting currentX
  if (align === "center" || align === "right") {
    const totalWidth = measureMixedText(ctx, value, size);

    if (align === "center") {
      currentX = posx - totalWidth / 2;
    } else {
      currentX = posx - totalWidth;
    }
  } else {
    currentX = posx;
  }

  let buffer = "";
  let lastWasJapanese = null;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const isJap = isJapanese(char);

    if (lastWasJapanese === null) {
      lastWasJapanese = isJap;
    }

    if (isJap !== lastWasJapanese) {
      drawChunk(ctx, buffer, size, currentX, posy, lastWasJapanese);
      currentX += measureChunk(ctx, buffer, size, lastWasJapanese);
      buffer = "";
      lastWasJapanese = isJap;
    }

    buffer += char;
  }

  drawChunk(ctx, buffer, size, currentX, posy, lastWasJapanese);
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

async function drawBackground(ctx, width, height, offset, favoriteCharacter) {
  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (favoriteCharacter) {
    // Find character object matching favoriteCharacter (case-insensitive)
    const matchedChar = game.characters.find(
      (char) => char.name.toLowerCase() === favoriteCharacter.toLowerCase(),
    );

    if (matchedChar) {
      gradient.addColorStop(0, matchedChar.color1);
      gradient.addColorStop(1, matchedChar.color2);
    } else {
      // fallback to default gradient if no match found
      gradient.addColorStop(0, "#6dd5ed"); // Light blue
      gradient.addColorStop(1, "#2193b0"); // Dark blue
    }
  } else {
    // favoriteCharacter not provided, use default gradient
    gradient.addColorStop(0, "#6dd5ed"); // Light blue
    gradient.addColorStop(1, "#2193b0"); // Dark blue
  }

  // Dimensions
  const rectX = 0;
  const rectY = offset;
  const rectWidth = width;
  const rectHeight = height - offset;
  const borderRadius = 20;

  // Draw rounded background rectangle
  ctx.save();
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
  ctx.fillStyle = gradient; // Set this to your desired fill
  ctx.fill();
  ctx.restore();

  // Draw rounded pattern image over it with opacity
  const image = await loadImage("./introduction/assets/pattern.png");
  ctx.save();
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
  ctx.clip(); // Apply rounded clipping path
  ctx.globalAlpha = 0.1;
  ctx.drawImage(image, rectX, rectY, rectWidth, rectHeight);
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

async function drawSecondBackground(
  ctx,
  width,
  height,
  offset,
  favoriteCharacter,
) {
  // Load the pattern image first (outside try/catch if not already done)
  const patternImage = await loadImage("./introduction/assets/pattern.png");

  // Calculate gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (favoriteCharacter) {
    const matchedChar = game.characters.find(
      (char) => char.name.toLowerCase() === favoriteCharacter.toLowerCase(),
    );

    if (matchedChar) {
      gradient.addColorStop(0, matchedChar.color1);
      gradient.addColorStop(1, matchedChar.color2);
    } else {
      gradient.addColorStop(0, "#6dd5ed");
      gradient.addColorStop(1, "#2193b0");
    }
  } else {
    gradient.addColorStop(0, "#6dd5ed");
    gradient.addColorStop(1, "#2193b0");
  }

  // Background rectangle properties
  const rectX = 0;
  const rectY = offset;
  const rectWidth = width;
  const rectHeight = height - offset;
  const borderRadius = 20;

  // Clipping mask rectangle (rotated)
  const maskX = 335;
  const maskY = -112;
  const maskWidth = 648;
  const maskHeight = 1000;
  const maskRotation = (8.59 * Math.PI) / 180; // in radians

  // ---- Final masked rendering ---- //
  ctx.save();

  // Translate to center of mask rect and rotate
  ctx.translate(maskX + maskWidth / 2, maskY + maskHeight / 2);
  ctx.rotate(maskRotation);

  // Create clipping rectangle
  ctx.beginPath();
  ctx.rect(-maskWidth / 2, -maskHeight / 2, maskWidth, maskHeight);
  ctx.closePath();
  ctx.clip();

  // Return to normal coordinates (while still inside clipping context)
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation matrix

  // Draw rounded background
  ctx.save();
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // Draw low-opacity pattern image over it
  ctx.save();
  roundRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);
  ctx.clip(); // Clip to rounded shape as well
  ctx.globalAlpha = 0.1;
  ctx.drawImage(patternImage, rectX, rectY, rectWidth, rectHeight);
  ctx.globalAlpha = 1.0;
  ctx.restore();

  // Restore after clipping mask
  ctx.restore();
}

async function drawLogo(ctx, width) {
  const img_width = 322;
  const img_height = 159;
  const image = await loadImage("./introduction/assets/logo.png");
  ctx.save();
  ctx.drawImage(image, width / 2 - img_width / 2, 0, img_width, img_height);
  ctx.restore();
}

async function drawFavoriteCharacter(
  ctx,
  width,
  height,
  offset,
  favoriteCharacter,
) {
  const favChar = favoriteCharacter.toLowerCase().replace(/\s+/g, "_");

  try {
    const image = await loadImage(`./introduction/characters/${favChar}.png`);

    const maxHeight = 450;
    const imgAspect = image.width / image.height;

    // Scale image based on maxHeight
    const drawHeight = maxHeight;
    const drawWidth = maxHeight * imgAspect;

    // Center the image at (150, height/2 + offset)
    const centerX = 200;
    const centerY = height / 2 + offset;

    const drawX = centerX - drawWidth / 2;
    const drawY = centerY - drawHeight / 2;

    ctx.save();
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    // Draw label text above image
    drawText(ctx, "MY FAVORITE BRAWLER", 25, 47, drawY - 60, 4);

    // Draw curved arrow
    const img_width = 48;
    const img_height = 48;
    const image_arrow = await loadImage(
      "./introduction/assets/curved-arrow.png",
    );

    const arrowX = 40;
    const arrowY = drawY - 40;
    const rotationDegrees = 56;
    const rotationRadians = rotationDegrees * (Math.PI / 180);

    const arrowCenterX = arrowX + img_width / 2;
    const arrowCenterY = arrowY + img_height / 2;

    ctx.save();
    ctx.translate(arrowCenterX, arrowCenterY);
    ctx.rotate(rotationRadians);
    ctx.drawImage(
      image_arrow,
      -img_width / 2,
      -img_height / 2,
      img_width,
      img_height,
    );
    ctx.restore();
  } catch (err) {
    logger.error("Failed to load image:", err);
  }
}

async function drawGamerTag(ctx, offset, gamertag, name) {
  if (name) {
    drawText(
      ctx,
      "HI, MY NAME IS (" + gamertag + ")",
      25,
      384,
      110 + offset,
      4,
    );
    drawText(ctx, name.toUpperCase(), 54, 384, 170 + offset, 9);
  } else {
    drawText(ctx, "HI, MY NAME IS", 25, 384, 110 + offset, 4);
    drawText(ctx, gamertag.toUpperCase(), 60, 384, 170 + offset, 9);
  }
}

async function drawProfile(ctx, offset, picture, interaction) {
  const img_width = 107;
  const img_height = 122;
  const image = await loadImage("./introduction/assets/pfp-star.png");
  ctx.save();
  ctx.drawImage(image, 384, 204 + offset, img_width, img_height);
  ctx.restore();
  drawText(ctx, "THIS IS ME!", 18, 390, 120 + 230 + offset, 4);

  const imgSize = 73; // adjust as needed
  let imageURL;

  if (picture) {
    imageURL = picture.url;
  } else {
    imageURL = interaction.user.displayAvatarURL({
      extension: "png",
      size: 512,
    });
  }

  try {
    const image = await loadImage(imageURL);

    const x = 384 + 17;
    const y = 120 + 109 + offset;

    // Step 1: Draw the circular profile picture
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + imgSize / 2, y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, imgSize, imgSize);
    ctx.restore();

    // Step 2: Draw the crescent-shaped inner shadow
    ctx.save();
    ctx.beginPath();

    // Outer circle (shadow base), slightly inset
    ctx.arc(x + imgSize / 2, y + imgSize / 2, imgSize / 2, 0, Math.PI * 2);

    // Inner cut (creates the crescent), offset to bottom-right to carve away that side
    ctx.arc(
      x + imgSize / 2 + 2, // move right
      y + imgSize / 2 + 2, // move down
      imgSize / 2 - 2,
      0,
      Math.PI * 2,
      true, // counter-clockwise to create subtraction effect
    );

    ctx.closePath();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();
    ctx.restore();
  } catch (err) {
    console.error("Failed to load image:", err);
  }
}

async function drawAge(ctx, age, offset) {
  const img_width = 166;
  const img_height = 166;
  const image = await loadImage("./introduction/assets/age-star.png");
  ctx.save();
  ctx.drawImage(image, 384 + 148, 185 + offset, img_width, img_height);
  ctx.restore();
  drawText(ctx, "THIS IS MY AGE", 18, 387 + 158, 120 + 230 + offset, 4);
  drawText(ctx, String(age), 34, 384 + 228, 120 + 155 + offset, 4, "center");
}

async function drawCountry(ctx, country, offset) {
  const img_width = 135;
  const img_height = 129;
  const image = await loadImage("./introduction/assets/hypercharge.png");
  ctx.save();
  ctx.drawImage(image, 384 + 337, 200 + offset, img_width, img_height);
  ctx.restore();
  drawText(ctx, "WHERE I'M FROM", 18, 380 + 336, 120 + 230 + offset, 4);

  // Match country name
  const countryData = countries.find(
    (c) => c.name.toLowerCase() === country.toLowerCase(),
  );

  if (countryData && countryData.code) {
    const countryCode = countryData.code.toUpperCase(); // e.g., "BE"
    const flagPath = `./introduction/assets/flags/${countryCode}.png`;

    try {
      const flagImage = await loadImage(flagPath); // load SVG as image

      // Draw the SVG to canvas
      const flagWidth = 42;
      const flagHeight = 42;
      ctx.drawImage(
        flagImage,
        380 + 389,
        120 + 133 + offset,
        flagWidth,
        flagHeight,
      ); // Adjust position/size as needed
    } catch (error) {
      console.error("Failed to load flag png:", error);
    }
  } else {
    console.warn("Country not found or missing code");
  }
}

async function drawBreak(ctx, offset) {
  const img_width = 492;
  const img_height = 37;
  const image = await loadImage("./introduction/assets/break.png");
  ctx.save();
  ctx.drawImage(image, 384, 361 + offset, img_width, img_height);
  ctx.restore();
}

async function drawBigBreak(ctx) {
  const img_width = 158;
  const img_height = 626;
  const image = await loadImage("./introduction/assets/big_break.png");
  ctx.save();
  ctx.drawImage(image, 240, 142, img_width, img_height);
  ctx.restore();
}

async function drawTextBox(
  ctx,
  value,
  title,
  offset,
  posx,
  posy,
  box,
  interaction,
) {
  drawText(ctx, title, 20, posx, posy, 4);

  const padding = 11;
  const boxWidth = 235;
  const fontSize = 20;
  const shadowOffset = 2;
  const radius = 10;
  const maxLines = 4;

  const boxX = posx + 10;
  const boxY = posy + 15;

  // Word-wrap the value
  const allLines = wrapText(ctx, value, boxWidth - padding * 2, fontSize);

  if (allLines.length > maxLines) {
    error = true;
    return interaction.reply({
      content: `❌ Text too long for box: "${box}", please make it shorter. You can copy your previous command by clicking on the blue introduction button on this message so you don't have to start over.`,
      flags: 64, // ephemeral
    });
  }

  const lines = allLines.slice(0, maxLines);
  const boxHeight = padding * 2 + fontSize * lines.length;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
  ctx.fill();
  ctx.restore();

  // Draw each line of text
  for (let i = 0; i < lines.length; i++) {
    const textX = boxX + padding;
    const textY = boxY + padding + fontSize * (i + 1) - 2;
    drawText(ctx, lines[i], fontSize, textX, textY, shadowOffset);
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = fontSize + 'px "Nougat"';
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function isJapanese(char) {
  return /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(char);
}

function drawChunk(ctx, chunk, size, x, y, isJapanese) {
  if (!chunk) return;

  ctx.save();
  ctx.font = size + (isJapanese ? 'px "Noto Sans JP"' : 'px "Nougat"');
  ctx.textAlign = "left"; // Always left here since we pre-aligned x
  ctx.strokeText(chunk, x, y);
  ctx.fillText(chunk, x, y);
  ctx.restore();
}

function measureChunk(ctx, text, size, isJapanese) {
  if (!text) return 0;
  ctx.save();
  ctx.font = size + 'px "' + (isJapanese ? "JapaneseFont" : "Nougat") + '"'; // match drawChunk
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function measureMixedText(ctx, value, size) {
  let width = 0;
  let buffer = "";
  let lastWasJapanese = null;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const isJap = isJapanese(char);

    if (lastWasJapanese === null) {
      lastWasJapanese = isJap;
    }

    if (isJap !== lastWasJapanese) {
      width += measureChunk(ctx, buffer, size, lastWasJapanese);
      buffer = "";
      lastWasJapanese = isJap;
    }

    buffer += char;
  }

  width += measureChunk(ctx, buffer, size, lastWasJapanese);
  return width;
}

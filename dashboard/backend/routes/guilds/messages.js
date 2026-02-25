const express = require("express");
const router = express.Router();
const axios = require("axios");
const { requireAuth, checkGuildPermission } = require("./middleware");

const cleanEmbeds = (embeds) =>
  embeds
    .map((embed) => {
      const cleaned = { ...embed };

      if (!cleaned.author?.name || cleaned.author.name === "Author name") {
        delete cleaned.author;
      } else {
        if (!cleaned.author.url) delete cleaned.author.url;
        if (!cleaned.author.icon_url) delete cleaned.author.icon_url;
      }

      if (!cleaned.title || cleaned.title === "Embed title") {
        delete cleaned.title;
        delete cleaned.url;
      } else if (!cleaned.url) {
        delete cleaned.url;
      }

      if (!cleaned.description || cleaned.description === "Embed description") {
        delete cleaned.description;
      }

      if (!cleaned.footer?.text || cleaned.footer.text === "Footer text") {
        delete cleaned.footer;
      } else if (!cleaned.footer.icon_url) {
        delete cleaned.footer.icon_url;
      }

      if (cleaned.fields) {
        cleaned.fields = cleaned.fields.filter((f) => f.name && f.value);
        if (cleaned.fields.length === 0) delete cleaned.fields;
      }

      if (cleaned.image && !cleaned.image.url) delete cleaned.image;
      if (cleaned.thumbnail && !cleaned.thumbnail.url) delete cleaned.thumbnail;
      if (!cleaned.timestamp) delete cleaned.timestamp;

      delete cleaned.images;

      return cleaned;
    })
    .filter((embed) => Object.keys(embed).length > 1);

// Get message content
router.get("/:guildId/message/:channelId/:messageId", requireAuth, checkGuildPermission, async (req, res) => {
  const { channelId, messageId } = req.params;

  try {
    const response = await axios.get(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
    );

    res.json({
      content: response.data.content || "",
      embeds: response.data.embeds || [],
      components: response.data.components || [],
    });
  } catch (err) {
    console.error("Error fetching message:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

// Send new message
router.post("/:guildId/message/:channelId", requireAuth, checkGuildPermission, async (req, res) => {
  const { guildId, channelId } = req.params;
  const { content, embeds, components } = req.body;

  try {
    const cleanedEmbeds = cleanEmbeds(embeds);
    const payload = {};

    if (content) payload.content = content;
    if (cleanedEmbeds.length > 0) payload.embeds = cleanedEmbeds;
    if (components && components.length > 0) payload.components = components;

    if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
      return res.status(400).json({ error: "Message must have content or embeds" });
    }

    const response = await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`Sent message to channel ${channelId} in guild ${guildId}`);
    res.json({ success: true, message: response.data });
  } catch (err) {
    console.error("Error sending message:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || "Failed to send message" });
  }
});

// Edit existing message
router.put("/:guildId/message/:channelId/:messageId", requireAuth, checkGuildPermission, async (req, res) => {
  const { channelId, messageId } = req.params;
  const { content, embeds, components } = req.body;

  try {
    const cleanedEmbeds = cleanEmbeds(embeds);
    const payload = {};

    if (content !== undefined) payload.content = content;
    if (cleanedEmbeds.length > 0) payload.embeds = cleanedEmbeds;
    if (components !== undefined) payload.components = components;

    const response = await axios.patch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      payload,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`Edited message ${messageId} in channel ${channelId}`);
    res.json({ success: true, message: response.data });
  } catch (err) {
    console.error("Error editing message:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || "Failed to edit message" });
  }
});

module.exports = router;

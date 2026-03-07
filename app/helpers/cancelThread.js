const { EmbedBuilder } = require("discord.js");

async function cancelThread(source) {
  try {
    // 🔎 Determine source type
    const isInteraction =
      source?.isButton?.() || source?.isStringSelectMenu?.();

    const guildId = isInteraction ? source.guildId : source.guildId;
    const channelId = isInteraction ? source.channelId : source.channelId;
    const client = isInteraction ? source.client : source.client;

    const guild = await client.guilds.fetch(guildId);

    let thread;
    try {
      thread = await guild.channels.fetch(channelId);
    } catch (err) {
      console.warn(
        `Thread fetch failed: ${
          err.code === 10003 ? "Unknown Channel" : err.message
        }`,
      );

      if (isInteraction) {
        return source.reply({
          content: "This thread no longer exists.",
          flags: 64,
        });
      }

      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Exit")
      .setDescription("This thread will be closed shortly.")
      .setColor("Red");

    // 🔹 Send closing message + remove members
    setTimeout(async () => {
      try {
        await thread.send({ embeds: [embed] });

        const members = await thread.members.fetch();

        for (const member of members.values()) {
          if (member.id !== client.user.id) {
            try {
              await thread.members.remove(member.id);
            } catch (removeErr) {
              console.warn(
                `Failed to remove member ${member.id}: ${removeErr.message}`,
              );
            }
          }
        }
      } catch (err) {
        console.warn(
          `Failed to send embed or fetch/remove members: ${err.message}`,
        );
      }
    }, 1000);

    // 🔹 Delete thread after delay
    setTimeout(async () => {
      if (!thread) return;

      try {
        if (thread.archived) {
          await thread.setArchived(false);
        }

        await thread.delete();
      } catch (err) {
        console.warn(`Thread deletion failed: ${err.message}`);
      }
    }, 20000);

    // 🔹 Interaction acknowledgement
    if (isInteraction) {
      try {
        if (!source.deferred && !source.replied) {
          await source.deferUpdate();
        }
      } catch {}
    }
  } catch (error) {
    console.error("Failed to close the thread:", error);

    if (source?.reply) {
      try {
        await source.reply({
          content: "An error occurred while trying to close this thread.",
          flags: 64,
        });
      } catch {}
    }
  }
}

module.exports = cancelThread;

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const GuildModule = require("../../models/GuildModule");
const TrolledUser = require("../../models/TrolledUser");
const AwardedReward = require("../../models/AwardedReward");

async function memberJoinsGuild(member, guildId) {
  try {
    const guild = member.guild;

    // ── TROLL RESTORATION ──────────────────────────────────────────────────────

    // Check if this user is currently being trolled
    const trolledUserData = await TrolledUser.findOne({
      guildId,
      userId: member.id,
    });
    console.log(trolledUserData);
    if (trolledUserData) {
      // Re-apply Trolled role
      let trolledRole = guild.roles.cache.find((r) => r.name === "Trolled");
      if (!trolledRole) {
        trolledRole = await guild.roles.create({
          name: "Trolled",
          color: 0x808080,
          reason: "Auto-created for troll shop reward",
        });
      }

      try {
        await member.roles.set([guild.id, trolledRole.id]);
      } catch (err) {
        logger.error(
          `Failed to re-apply Trolled role to ${member.user.tag}:`,
          err,
        );
      }

      // Re-add them to the troll channel with view permission
      try {
        const trollChannel = await guild.channels
          .fetch(trolledUserData.channelId)
          .catch(() => null);
        if (trollChannel) {
          await trollChannel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
          });
        }
      } catch (err) {
        logger.error(
          `Failed to re-add ${member.user.tag} to troll channel:`,
          err,
        );
      }

      logger.info(
        `Re-applied troll restrictions to rejoining user ${member.user.tag}`,
      );

      // Skip auto role and welcome since this user is trolled
      // Still fall through to check if they trolled someone else
    }

    // Check if this user has trolled someone else — re-add them to that troll channel
    const trolledByThisUser = await TrolledUser.findOne({
      guildId,
      userId: { $ne: member.id },
    });
    // We need to find troll channels where this user was the troller
    // The troller's userId isn't stored in TrolledUser, but they have a channel permission overwrite
    // So we scan troll channels for this user's overwrite
    const trollChannels = guild.channels.cache.filter((c) =>
      c.name?.startsWith("troll-"),
    );
    for (const [, channel] of trollChannels) {
      try {
        const overwrite = channel.permissionOverwrites.cache.get(member.id);
        if (overwrite) {
          // Re-apply their overwrite
          await channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            ReadMessageHistory: true,
          });
          logger.info(
            `Re-added troller ${member.user.tag} to troll channel ${channel.name}`,
          );
        }
      } catch (err) {
        // Non-fatal
      }
    }

    // ── AWARDED ROLE RESTORATION ───────────────────────────────────────────────

    const awardedRole = await AwardedReward.findOne({
      guildId,
      awardedUserId: member.id,
      reward: "addRole",
    });

    if (awardedRole?.value) {
      // value stores the role name — find the role by name
      const role = guild.roles.cache.find((r) => r.name === awardedRole.value);
      if (role) {
        try {
          await member.roles.add(role);
          logger.info(
            `Restored awarded role "${role.name}" to rejoining user ${member.user.tag}`,
          );
        } catch (err) {
          logger.error(
            `Failed to restore awarded role to ${member.user.tag}:`,
            err,
          );
        }
      }
    }

    // ── AWARDED NICKNAME RESTORATION ──────────────────────────────────────────

    // Check changeNickname (own) or changeOtherNickname (someone set it for them)
    const awardedNickname = await AwardedReward.findOne({
      guildId,
      awardedUserId: member.id,
      reward: { $in: ["changeNickname", "changeOtherNickname"] },
    }).sort({ date: -1 }); // most recent one wins

    if (awardedNickname?.value) {
      try {
        await member.setNickname(awardedNickname.value);
        logger.info(
          `Restored nickname "${awardedNickname.value}" to rejoining user ${member.user.tag}`,
        );
      } catch (err) {
        if (err.code === 50013) {
          logger.warn(
            `Cannot set nickname for ${member.user.tag} — likely server owner or missing permissions`,
          );
        } else {
          logger.error(
            `Failed to restore nickname to ${member.user.tag}:`,
            err,
          );
        }
      }
    }

    // ── AUTO ROLE ──────────────────────────────────────────────────────────────

    // Skip auto role if user is trolled
    if (!trolledUserData) {
      const autoRoleModule = await GuildModule.findOne({
        guildId,
        moduleId: "autorole",
        enabled: true,
      });

      if (autoRoleModule?.settings?.roleId) {
        const role = guild.roles.cache.get(autoRoleModule.settings.roleId);
        if (role) {
          try {
            await member.roles.add(role);
            logger.success(
              `Added role "${role.name}" to ${member.user.tag} in ${guild.name}`,
            );
          } catch (error) {
            logger.error(
              `Failed to add role to ${member.user.tag} in ${guild.name}:`,
              error,
            );
          }
        } else {
          logger.warn(
            `Auto role ${autoRoleModule.settings.roleId} not found in guild ${guild.name}`,
          );
        }
      }
    }

    // ── WELCOME MESSAGE ────────────────────────────────────────────────────────

    // Skip welcome message if user is trolled
    if (!trolledUserData) {
      const welcomeModule = await GuildModule.findOne({
        guildId,
        moduleId: "welcome",
        enabled: true,
      });

      if (
        welcomeModule?.settings?.welcomeMessage &&
        welcomeModule?.settings?.channelId
      ) {
        const channel = guild.channels.cache.get(
          welcomeModule.settings.channelId,
        );
        if (channel) {
          let message = welcomeModule.settings.welcomeMessage;
          message = message.replace(/{user}/g, `<@${member.id}>`);
          message = message.replace(/{username}/g, member.user.username);
          message = message.replace(/{server}/g, guild.name);

          try {
            const embed = new EmbedBuilder()
              .setTitle("Welcome")
              .setDescription(message)
              .setColor("Green");
            await channel.send({ embeds: [embed] });
            logger.success(
              `Sent welcome message for ${member.user.tag} in ${guild.name}`,
            );
          } catch (error) {
            logger.error(
              `Failed to send welcome message in ${guild.name}:`,
              error,
            );
          }
        } else {
          logger.warn(
            `Welcome channel ${welcomeModule.settings.channelId} not found in guild ${guild.name}`,
          );
        }
      }
    }
  } catch (error) {
    logger.error(`Error handling member join in ${member.guild.name}:`, error);
  }
}

module.exports = memberJoinsGuild;

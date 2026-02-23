const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const GuildModule = require("../models/GuildModule");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-role")
    .setDescription("Add a role to a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to assign the role to")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role to assign to the user")
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const role = interaction.options.getRole("role");
    const member = await interaction.guild.members.fetch(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const embed = new EmbedBuilder()
        .setTitle("Add Role")
        .setDescription(`❌ You don't have permission to manage roles.`)
        .setColor("Red");
      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

    try {
      // Check if addrole module is enabled and has a role configured
      const addRoleModule = await GuildModule.findOne({
        guildId: interaction.guild.id,
        moduleId: "addrole",
        enabled: true,
      });

      let roleToRemove = null;
      if (addRoleModule && addRoleModule.settings?.roleId) {
        const configuredRole = interaction.guild.roles.cache.get(
          addRoleModule.settings.roleId
        );

        if (configuredRole && member.roles.cache.has(configuredRole.id)) {
          roleToRemove = configuredRole;
        }
      }

      // Remove the configured role if it exists
      if (roleToRemove) {
        await member.roles.remove(roleToRemove);
      }

      // Add the new role
      await member.roles.add(role);

      const embed = new EmbedBuilder()
        .setTitle("Add Role")
        .setDescription(
          roleToRemove
            ? `✅ Successfully added <@&${role.id}> to <@${user.id}> and removed <@&${roleToRemove.id}>.`
            : `✅ Successfully added <@&${role.id}> to <@${user.id}>.`
        )
        .setColor("Green");

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      logger.error("Error assigning role:", error);
      const embed = new EmbedBuilder()
        .setTitle("Add Role")
        .setDescription(
          `❌ Failed to assign the role. Check my permissions and role hierarchy.`
        )
        .setColor("Red");
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }
  },
};

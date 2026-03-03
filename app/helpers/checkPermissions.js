const { PermissionsBitField, EmbedBuilder } = require("discord.js");

async function checkPermissions(client, permission, guild) {
  const botMember = await guild.members.fetch(client.user.id);

  // Convert string to PermissionsBitField flag
  const permissionFlag = PermissionsBitField.Flags[permission];

  if (!botMember.permissions.has(permissionFlag)) {
    const embed = new EmbedBuilder()
      .setTitle("Permissions Error")
      .setDescription(
        "I don't have the required permission. Please contact your administrator.",
      )
      .setColor("Red");

    return embed;
  }

  return null;
}

module.exports = checkPermissions;

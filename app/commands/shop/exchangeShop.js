const getRewards = require("../../helpers/getRewards");
const GuildModule = require("../../models/GuildModule");
const { EmbedBuilder } = require("discord.js");

async function handleExchangeShop(interaction) {
  await interaction.deferReply({ flags: 64 });
  // Step 1: Create a thread
  const guild = await interaction.client.guilds.fetch(interaction.guildId);
  const channel = await guild.channels.fetch(interaction.channelId);

  // Create a private thread that is only visible to the user who clicked the button
  const thread = await channel.threads.create({
    name: `Shop - ${interaction.member.user.globalName}`, // Ensure you use the correct user property
    autoArchiveDuration: 60, // Archive the thread after 60 minutes of inactivity
    reason: "User initiated exchange shop interaction",
    invitable: false, // Don't allow other users to join the thread
    type: 12, // Private Thread (only visible to members who are added)
  });

  // Add the user who clicked the button to the thread
  await thread.members.add(interaction.member.user.id);

  let optionsList = [];

  try {
    const economyModule = await GuildModule.findOne({
      guildId: interaction.guildId,
      moduleId: "economy",
    });

    const rewards = await getRewards(economyModule);
    rewards.forEach((reward, index) => {
      optionsList.push({
        label: reward.shortDescription.substring(0, 100), // max 100 chars
        value: `shop_${reward.id}_menu`,
        description: reward.menuDescription?.substring(0, 100) || undefined, // max 100 chars
      });
    });

    const gamble = economyModule.settings.gamble;
    if (gamble.currency.enabled || gamble.extraCurrency.enabled) {
      optionsList.push({
        label: "Gamble",
        value: "shop_gamble_menu",
        description: "Gamble your shop currency for a chance to double it.",
      });
    }
  } catch (error) {
    logger.error("Exchange Shop Error:" + error);

    const embed = new EmbedBuilder()
      .setTitle("Error Rewards")
      .setDescription(
        `I could not find the rewards in the database. Please contact the administrator.`,
      )
      .setColor("Red");

    await interaction.editReply({ embeds: [embed], flags: 64 });
    return;
  }

  try {
    // Post the message in the thread
    let embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(`Please choose one of the following options to redeem:`)
      .setColor("Green");

    // Send the message to the thread
    const message = await thread.send({
      content: "Please select an option from the dropdown below:",
      embeds: [embed],
      components: [
        {
          type: 1, // Action Row
          components: [
            {
              type: 3, // Select Menu
              custom_id: "shop_exchange_menu",
              options: optionsList,
              placeholder: "Select an option...",
            },
          ],
        },
        {
          type: 1, // Action Row
          components: [
            {
              type: 2, // Button
              style: 4, // Danger style
              label: "Cancel",
              custom_id: "cancel-thread",
            },
          ],
        },
      ],
    });

    embed = new EmbedBuilder()
      .setTitle("Shop")
      .setDescription(
        `Please continue in the private thread I created [here](https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}).`,
      )
      .setColor("Green");
    await interaction.followUp({ embeds: [embed], flags: 64 });
  } catch (error) {
    logger.error(
      "There was an issue with sending the follow up message in the exchange shop",
    );
    logger.error(error);
  }
}

module.exports = handleExchangeShop;

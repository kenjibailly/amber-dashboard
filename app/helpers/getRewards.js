const Rewards = require("../config/rewards.json");

async function getRewards(walletConfig) {
  const rewards = walletConfig.settings?.rewards || {};
  const allRewards = walletConfig.settings?.allRewards || {};
  const rewardsList = [];

  Object.entries(rewards).forEach(([rewardName, reward]) => {
    if (!reward.enabled) return;

    const rewardMeta = Rewards.find((r) => r.name === rewardName);
    if (!rewardMeta) return;
    // Use global defaults if they exist
    const price = allRewards.price?.trim() ? allRewards.price : reward.price;
    const time = allRewards.time?.trim() ? allRewards.time : reward.time;

    const rewardTime = time ? ` (${time} days)` : "";

    rewardsList.push({
      name: `**${price}** ${walletConfig.tokenEmoji} - ${rewardMeta.shortDescription}${rewardTime}`,
      value: rewardMeta.longDescription || " ",
      inline: false,
      shortDescription: rewardMeta.shortDescription,
      id: rewardMeta.name,
      price: price,
      menuDescription: rewardMeta.menuDescription,
    });
  });

  return rewardsList;
}

module.exports = getRewards;

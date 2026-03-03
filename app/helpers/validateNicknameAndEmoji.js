function validateNicknameAndEmoji(content) {
  // Regular expression to match any emoji
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

  // Extract all emojis from the content
  const emojis = content.match(emojiRegex) || [];

  // Check if there are more than one emoji
  if (emojis.length > 1) {
    return "Please include no more than one emoji in your message.";
  }

  // Remove the emoji from the content to validate the nickname
  const nicknameWithoutEmoji = content.replace(emojiRegex, "").trim();

  // Check the length of the nickname
  if (nicknameWithoutEmoji.length < 1 || nicknameWithoutEmoji.length > 32) {
    return "Nickname must be between 1 and 32 characters long.";
  }

  // Check for valid characters in the nickname (letters, numbers, underscores, spaces)
  const validNicknameRegex = /^[\w\s]+$/;
  if (!validNicknameRegex.test(nicknameWithoutEmoji)) {
    return "Nickname can only contain letters, numbers, underscores, and spaces.";
  }

  // If all validations pass
  return null;
}

module.exports = validateNicknameAndEmoji;

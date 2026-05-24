export function formatCaption(text) {
  return `${text}`;
}

export async function sendTelegramPhoto(bot, channelId, photo, caption) {
  return await bot.telegram.sendPhoto(
    channelId,
    photo,
    {
      caption
    }
  );
}

export async function sendTelegramMessage(bot, channelId, text) {
  return await bot.telegram.sendMessage(
    channelId,
    text
  );
}
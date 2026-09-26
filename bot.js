// JavaScript | config/bot.js | Node.js 20+ | ZAINU-MD Bot Configuration

"use strict";

module.exports = {
  name: process.env.BOT_NAME || "𝐙𝐀𝐈𝐍𝐔-𝐌𝐃 ⚜️🔥",
  owner: process.env.BOT_OWNER || "",
  channel: process.env.BOT_CHANNEL || "",
  channelId: process.env.BOT_CHANNEL_ID || "",
  profile: process.env.BOT_PROFILE || "",
  version: process.env.BOT_VERSION || "1.0.0",

  features: {
    multiSession: true,
    pairingCode: true,
    autoReconnect: true,
    webPanel: true,
    commands: false
  }
};

// JavaScript | lib/logger.js | Node.js 20+ | ZAINU-MD

"use strict";

const pino = require("pino");

module.exports = pino({
  level: process.env.LOG_LEVEL || "info"
});


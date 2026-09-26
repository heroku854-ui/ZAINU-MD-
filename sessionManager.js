// JavaScript | lib/sessionManager.js | Node.js 20+ | Android/Linux | ZAINU-MD

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const baileys = require("@whiskeysockets/baileys");

const makeWASocket =
  baileys.default || baileys.makeWASocket;

const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = baileys;

const logger = require("./logger");
const {
  normalizePhoneNumber,
  validatePhoneNumber
} = require("./pairing");

const SESSION_ROOT = path.join(process.cwd(), "sessions");

if (!fs.existsSync(SESSION_ROOT)) {
  fs.mkdirSync(SESSION_ROOT, {
    recursive: true
  });
}

const sessions = new Map();

function getSessionFolder(number) {
  return path.join(
    SESSION_ROOT,
    normalizePhoneNumber(number)
  );
}

function getSession(number) {
  return sessions.get(normalizePhoneNumber(number)) || null;
}

function getAllSessions() {
  return Array.from(sessions.values()).map((session) => ({
    number: session.number,
    status: session.status,
    connected: session.connected,
    pairing: session.pairing,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  }));
}

async function createSession(phoneNumber, options = {}) {
  const validation = validatePhoneNumber(phoneNumber);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const number = validation.number;

  if (sessions.has(number)) {
    const existing = sessions.get(number);

    return {
      ok: true,
      alreadyExists: true,
      number,
      status: existing.status
    };
  }

  const folder = getSessionFolder(number);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true
    });
  }

  const { state, saveCreds } =
    await useMultiFileAuthState(folder);

  const session = {
    number,
    status: "starting",
    connected: false,
    pairing: false,
    socket: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    reconnecting: false
  };

  sessions.set(number, session);

  const startSocket = async () => {
    try {
      const socket = makeWASocket({
        auth: state,
        logger,
        browser: Browsers.ubuntu("Chrome"),
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false
      });

      session.socket = socket;
      session.status = "connecting";
      session.updatedAt = Date.now();

      socket.ev.on("creds.update", saveCreds);

      socket.ev.on("connection.update", async (update) => {
        const {
          connection,
          lastDisconnect
        } = update;

        session.updatedAt = Date.now();

        if (connection === "open") {
          session.status = "connected";
          session.connected = true;
          session.pairing = false;
          session.reconnecting = false;

          logger.info(
            `[ZAINU-MD] Connected: ${number}`
          );
        }

        if (connection === "close") {
          session.connected = false;
          session.pairing = false;

          const error =
            lastDisconnect?.error;

          const statusCode =
            error?.output?.statusCode;

          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            session.status = "reconnecting";

            if (!session.reconnecting) {
              session.reconnecting = true;

              logger.info(
                `[ZAINU-MD] Reconnecting: ${number}`
              );

              setTimeout(() => {
                session.reconnecting = false;
                startSocket().catch((err) => {
                  logger.error(err);
                });
              }, 3000);
            }
          } else {
            session.status = "logged_out";

            logger.info(
              `[ZAINU-MD] Logged out: ${number}`
            );

            sessions.delete(number);
          }

          session.updatedAt = Date.now();
        }
      });

      if (
        options.generatePairingCode &&
        !state.creds.registered
      ) {
        session.pairing = true;
        session.status = "pairing";

        const code =
          await socket.requestPairingCode(number);

        session.pairingCode = code;
        session.updatedAt = Date.now();

        return code;
      }

      return null;
    } catch (error) {
      session.status = "error";
      session.connected = false;
      session.updatedAt = Date.now();

      logger.error(error);

      throw error;
    }
  };

  const pairingCode = await startSocket();

  return {
    ok: true,
    number,
    status: session.status,
    pairingCode: pairingCode || null
  };
}

async function loadSavedSessions() {
  if (!fs.existsSync(SESSION_ROOT)) {
    return;
  }

  const folders = fs
    .readdirSync(SESSION_ROOT, {
      withFileTypes: true
    })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const number of folders) {
    try {
      await createSession(number);
    } catch (error) {
      logger.error(
        `[ZAINU-MD] Failed to load ${number}`
      );

      logger.error(error);
    }
  }
}

function getStats() {
  const all = Array.from(sessions.values());

  return {
    total: all.length,
    connected: all.filter(
      (s) => s.connected
    ).length,
    connecting: all.filter(
      (s) =>
        s.status === "connecting" ||
        s.status === "starting"
    ).length,
    pairing: all.filter(
      (s) => s.pairing
    ).length,
    reconnecting: all.filter(
      (s) => s.status === "reconnecting"
    ).length
  };
}

module.exports = {
  createSession,
  getSession,
  getAllSessions,
  loadSavedSessions,
  getStats,
  normalizePhoneNumber
};

// JavaScript | server.js | Node.js 20+ | Android/Linux | ZAINU-MD Framework

"use strict";

require("dotenv").config();

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const BOT = require("./config/bot");

const {
  createSession,
  getSession,
  getAllSessions,
  loadSavedSessions,
  getStats,
  normalizePhoneNumber
} = require("./lib/sessionManager");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PANEL_KEY =
  process.env.PANEL_KEY || "change-this-key";

const PANEL_FILE = path.join(
  process.cwd(),
  "panel",
  "index.html"
);

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });

  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end(text);
}

function sendPanel(res) {
  if (!fs.existsSync(PANEL_FILE)) {
    return sendText(
      res,
      500,
      "Web panel is not installed."
    );
  }

  const html = fs.readFileSync(
    PANEL_FILE,
    "utf8"
  );

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8"
  });

  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(
          new Error("Request body too large.")
        );

        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(
          new Error("Invalid JSON body.")
        );
      }
    });

    req.on("error", reject);
  });
}

function checkPanelKey(req) {
  const key = req.headers["x-panel-key"];

  return (
    typeof key === "string" &&
    key.length > 0 &&
    key === PANEL_KEY
  );
}

function route(req, res) {
  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  const pathname = url.pathname;

  if (
    req.method === "GET" &&
    pathname === "/api/health"
  ) {
    return sendJson(res, 200, {
      ok: true,
      bot: BOT.name,
      version: BOT.version,
      status: "online",
      stats: getStats(),
      timestamp: new Date().toISOString()
    });
  }

  if (
    req.method === "GET" &&
    pathname === "/api/config"
  ) {
    return sendJson(res, 200, {
      ok: true,
      bot: {
        name: BOT.name,
        version: BOT.version,
        owner: BOT.owner,
        channel: BOT.channel,
        profile: BOT.profile
      },
      features: BOT.features
    });
  }

  if (
    req.method === "GET" &&
    pathname === "/api/sessions"
  ) {
    return sendJson(res, 200, {
      ok: true,
      stats: getStats(),
      sessions: getAllSessions()
    });
  }

  if (
    req.method === "GET" &&
    pathname.startsWith("/api/session/")
  ) {
    const number = normalizePhoneNumber(
      pathname.replace("/api/session/", "")
    );

    const session = getSession(number);

    if (!session) {
      return sendJson(res, 404, {
        ok: false,
        error: "Session not found."
      });
    }

    return sendJson(res, 200, {
      ok: true,
      session: {
        number: session.number,
        status: session.status,
        connected: session.connected,
        pairing: session.pairing,
        pairingCode: session.pairingCode || null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });
  }

  if (
    req.method === "POST" &&
    pathname === "/api/pair"
  ) {
    if (!checkPanelKey(req)) {
      return sendJson(res, 401, {
        ok: false,
        error: "Invalid panel key."
      });
    }

    readBody(req)
      .then(async (body) => {
        const result = await createSession(
          body.number,
          {
            generatePairingCode: true
          }
        );

        sendJson(res, 200, result);
      })
      .catch((error) => {
        sendJson(res, 400, {
          ok: false,
          error: error.message
        });
      });

    return;
  }

  if (
    req.method === "GET" &&
    (pathname === "/" ||
      pathname === "/index.html")
  ) {
    return sendPanel(res);
  }

  return sendJson(res, 404, {
    ok: false,
    error: "Route not found."
  });
}

const server = http.createServer(route);

server.listen(PORT, HOST, async () => {
  console.log("");
  console.log("======================================");
  console.log(`  ${BOT.name}`);
  console.log("  Multi-Session WhatsApp Framework");
  console.log("======================================");
  console.log(`  Panel: http://localhost:${PORT}`);
  console.log(`  Host: ${HOST}`);
  console.log(`  Port: ${PORT}`);
  console.log("======================================");
  console.log("");

  try {
    await loadSavedSessions();

    console.log(
      `[ZAINU-MD] Loaded ${getStats().total} session(s).`
    );
  } catch (error) {
    console.error(
      "[ZAINU-MD] Session loading error:",
      error
    );
  }
});

process.on("SIGINT", () => {
  console.log("\n[ZAINU-MD] Shutting down...");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  console.log("\n[ZAINU-MD] Shutting down...");
  server.close(() => process.exit(0));
});
      

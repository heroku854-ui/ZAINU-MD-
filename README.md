# ZAINU-MD

ZAINU-MD is a GitHub-ready Multi-Session WhatsApp Bot Framework built with Node.js and Baileys.

## Included

- Multi-session WhatsApp support
- Pairing-code authentication
- Separate session storage per WhatsApp number
- Automatic reconnect
- Session status
- Web panel foundation
- Bot configuration
- Extendable command structure
- Extendable handler structure
- GitHub-ready project structure

## Not Included

- No custom commands
- No personal WhatsApp session
- No personal `.env`
- No node_modules

## Project Structure

```text
ZAINU-MD/
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
│
├── config/
│   └── bot.js
│
├── lib/
│   ├── sessionManager.js
│   ├── pairing.js
│   └── logger.js
│
├── commands/
├── handlers/
├── panel/
└── sessions/

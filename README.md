# Duel Dash

A simple real-time 2-player browser game. Create a room, share the 6-character code, and race to collect targets for 60 seconds.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser windows/devices on a network where the server is reachable.

## Deploy

This is a Node/Express + Socket.IO app and needs a host that supports a persistent Node process/WebSockets. Set the platform's PORT environment variable if required. Vercel's serverless model is not the ideal target for Socket.IO; use a WebSocket-capable Node host such as Railway, Render, or another persistent service.

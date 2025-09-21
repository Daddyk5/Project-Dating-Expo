// index.js (CommonJS)
const http = require('http');
const app = require('./app');                  // <- no .js extension needed
const PORT = process.env.PORT || 8080;

// Optional socket hook; keep it if you actually have one:
let attachSocket;
try { attachSocket = require('./sockets'); } catch { /* no sockets, ignore */ }

const server = http.createServer(app);
if (typeof attachSocket === 'function') {
  attachSocket(server, process.env.CORS_ORIGIN || '*');
}

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

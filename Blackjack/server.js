const fs = require('fs');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 2);
const WEB_ROOT = __dirname;
const PING_INTERVAL_MS = 30_000;

const lobbies = new Map(); // code -> { code, status, players: [{ id, name, role, socket }] }
const clients = new Map(); // socket -> { id, name, lobbyCode }

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
};

function randomId() {
    return Math.random().toString(36).slice(2, 10);
}

function randomCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

function generateUniqueCode() {
    let code = randomCode();
    while (lobbies.has(code)) {
        code = randomCode();
    }
    return code;
}

function send(socket, type, payload = {}) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, ...payload }));
    }
}

function broadcast(lobby, type, payload) {
    lobby.players.forEach((p) => send(p.socket, type, payload));
}

function serializePlayers(lobby) {
    return lobby.players.map(({ id, name, role }) => ({ id, name, role }));
}

function getClient(socket) {
    return clients.get(socket);
}

function removeFromLobby(socket) {
    const client = getClient(socket);
    if (!client || !client.lobbyCode) return;
    const lobby = lobbies.get(client.lobbyCode);
    if (!lobby) {
        client.lobbyCode = null;
        return;
    }

    lobby.players = lobby.players.filter((p) => p.socket !== socket);

    if (lobby.players.length === 0) {
        lobbies.delete(client.lobbyCode);
    } else {
        if (!lobby.players.some((p) => p.role === 'host')) {
            lobby.players[0].role = 'host';
        }
        broadcast(lobby, 'lobby_update', { players: serializePlayers(lobby) });
    }

    client.lobbyCode = null;
}

function handleCreateLobby(socket, payload) {
    const client = getClient(socket);
    if (!client) return;

    removeFromLobby(socket);

    const code = generateUniqueCode();
    const name = (payload?.name || client.name || 'Host').slice(0, 32);
    const lobby = {
        code,
        status: 'waiting',
        players: [{ id: client.id, name, role: 'host', socket }],
    };

    lobbies.set(code, lobby);
    client.lobbyCode = code;
    client.name = name;

    send(socket, 'lobby_created', { code, players: serializePlayers(lobby) });
}

function handleJoinLobby(socket, payload) {
    const client = getClient(socket);
    if (!client) return;

    const code = (payload?.code || '').trim();
    const name = (payload?.name || client.name || 'Guest').slice(0, 32);
    const lobby = lobbies.get(code);

    if (!lobby) {
        return send(socket, 'error', { message: 'Lobby not found.' });
    }

    if (lobby.players.length >= MAX_PLAYERS) {
        return send(socket, 'error', { message: 'Lobby is full.' });
    }

    removeFromLobby(socket);

    lobby.players.push({ id: client.id, name, role: 'guest', socket });
    client.lobbyCode = code;
    client.name = name;

    send(socket, 'lobby_joined', { code, players: serializePlayers(lobby) });
    broadcast(lobby, 'lobby_update', { players: serializePlayers(lobby) });
}

function handleLeaveLobby(socket) {
    const client = getClient(socket);
    if (!client || !client.lobbyCode) return;
    const lobby = lobbies.get(client.lobbyCode);
    removeFromLobby(socket);
    if (lobby) {
        broadcast(lobby, 'lobby_update', { players: serializePlayers(lobby) });
    }
}

function handleChat(socket, payload) {
    const client = getClient(socket);
    if (!client || !client.lobbyCode) return;
    const lobby = lobbies.get(client.lobbyCode);
    if (!lobby) return;

    const text = (payload?.text || '').toString().slice(0, 300);
    if (!text.trim()) return;

    const message = {
        from: client.name || 'Player',
        text,
        ts: Date.now(),
    };

    broadcast(lobby, 'chat_message', message);
}

function handleStartGame(socket) {
    const client = getClient(socket);
    if (!client || !client.lobbyCode) return;
    const lobby = lobbies.get(client.lobbyCode);
    if (!lobby) return;

    const isHost = lobby.players.some((p) => p.socket === socket && p.role === 'host');
    if (!isHost) {
        return send(socket, 'error', { message: 'Only host can start the game.' });
    }

    if (lobby.players.length < 2) {
        return send(socket, 'error', { message: 'Waiting for an opponent.' });
    }

    lobby.status = 'active';
    broadcast(lobby, 'game_start', { code: lobby.code });
}

function handleMessage(socket, data) {
    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (err) {
        return send(socket, 'error', { message: 'Invalid JSON' });
    }

    const { type, payload } = parsed;
    switch (type) {
        case 'create_lobby':
            return handleCreateLobby(socket, payload);
        case 'join_lobby':
            return handleJoinLobby(socket, payload);
        case 'leave_lobby':
            return handleLeaveLobby(socket);
        case 'chat_message':
            return handleChat(socket, payload);
        case 'start_game':
            return handleStartGame(socket, payload);
        default:
            return send(socket, 'error', { message: 'Unknown event type' });
    }
}

function serveStatic(req, res) {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        return res.end();
    }

    const urlPath = decodeURI(req.url.split('?')[0]);
    const normalized = path
        .normalize(urlPath)
        .replace(/^(\.\.[/\\])+/, '')
        .replace(/^[/\\]+/, '');
    const target = normalized === '' || normalized === path.sep || normalized === '.' ? 'index.html' : normalized;
    let filePath = path.join(WEB_ROOT, target);

    if (!filePath.startsWith(WEB_ROOT)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end('Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
        return res.end();
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (err) => {
        console.error('File stream error:', err.message);
        res.writeHead(500);
        res.end('Server error');
    });
}

function startServer() {
    const server = http.createServer(serveStatic);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (socket) => {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        const client = { id: randomId(), name: `Player-${randomId().slice(0, 4)}`, lobbyCode: null };
        clients.set(socket, client);

        socket.on('message', (data) => handleMessage(socket, data));

        socket.on('close', () => {
            removeFromLobby(socket);
            clients.delete(socket);
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
        });

        send(socket, 'welcome', { id: client.id });
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, PING_INTERVAL_MS);

    wss.on('close', () => clearInterval(interval));

    server.listen(PORT, HOST, () => {
        console.log(`HTTP server running at http://${HOST}:${PORT}`);
        console.log(`WebSocket lobby server running at ws://${HOST}:${PORT}`);
    });
}

startServer();

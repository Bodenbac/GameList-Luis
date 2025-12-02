const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 2;
const lobbies = new Map(); // code -> { code, players: [{ id, name, role, socket }], status }
const clients = new Map(); // socket -> { id, name, lobbyCode }

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
    if (socket.readyState === socket.OPEN) {
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
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p.socket !== socket);

    if (lobby.players.length === 0) {
        lobbies.delete(client.lobbyCode);
    } else {
        // Promote next player to host if needed
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
        players: [
            { id: client.id, name, role: 'host', socket }
        ]
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
        ts: Date.now()
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
        case 'chat_message':
            return handleChat(socket, payload);
        case 'start_game':
            return handleStartGame(socket, payload);
        default:
            return send(socket, 'error', { message: 'Unknown event type' });
    }
}

function startServer() {
    const wss = new WebSocketServer({ port: PORT });
    console.log(`WebSocket lobby server running on ws://localhost:${PORT}`);

    wss.on('connection', (socket) => {
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
}

startServer();

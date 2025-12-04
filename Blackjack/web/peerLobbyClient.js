/**
 * PeerJS-based lobby client (WebRTC)
 * Mirrors the LobbyClient interface so the UI can switch transports without changes.
 */
class PeerLobbyClient {
    constructor({ peerOptions = {} } = {}) {
        this.peerOptions = { debug: 1, ...peerOptions };
        this.handlers = {};
        this.pendingOpen = null;
        this.peer = null;
        this.connections = new Map();
        this.players = new Map();
        this.status = 'disconnected';
        this.playerName = `Player-${Math.random().toString(36).slice(2, 6)}`;
        this.isHost = false;
        this.hostId = null;
        this.hostConn = null;
        this.selfId = null;
    }

    on(type, handler) {
        if (!this.handlers[type]) this.handlers[type] = [];
        this.handlers[type].push(handler);
    }

    emit(type, payload) {
        (this.handlers[type] || []).forEach((fn) => fn(payload));
    }

    setPlayerName(name) {
        const safe = (name || '').toString().trim();
        if (!safe) return;
        this.playerName = safe.slice(0, 32);
        const selfEntry = this.selfId ? this.players.get(this.selfId) : null;
        if (selfEntry) {
            selfEntry.name = this.playerName;
            if (this.isHost) {
                this.broadcastLobbyUpdate();
                this.emit('lobby_update', { players: this.serializePlayers() });
            }
        }
    }

    generateCode() {
        const num = Math.floor(Math.random() * 1_000_000);
        return num.toString().padStart(6, '0');
    }

    addPlayer(id, name, role, { ready = false } = {}) {
        const safeName = (name || '').toString().slice(0, 32) || `Player-${id.slice(0, 4)}`;
        this.players.set(id, { id, name: safeName, role, ready: !!ready });
    }

    serializePlayers() {
        return Array.from(this.players.values()).map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            ready: !!p.ready,
        }));
    }

    async ensureConnection(forcedId) {
        if (typeof Peer === 'undefined') {
            throw new Error('PeerJS is not loaded.');
        }

        if (this.peer && !this.peer.destroyed && (this.peer.open || this.status === 'connected')) {
            return;
        }

        if (this.pendingOpen) return this.pendingOpen;

        this.peer = new Peer(forcedId, this.peerOptions);
        this.pendingOpen = new Promise((resolve, reject) => {
            const fail = (err) => {
                this.status = 'disconnected';
                this.pendingOpen = null;
                reject(err);
                this.emit('error', { message: err?.message || 'Peer connection failed.' });
            };

            this.peer.on('open', (id) => {
                this.status = 'connected';
                this.pendingOpen = null;
                this.selfId = id;
                resolve();
            });

            this.peer.on('error', fail);

            this.peer.on('disconnected', () => {
                this.status = 'disconnected';
                this.emit('disconnected');
            });

            this.peer.on('close', () => {
                this.status = 'disconnected';
            });

            this.peer.on('connection', (conn) => {
                if (!this.isHost) {
                    conn.close();
                    return;
                }
                this.acceptIncomingConnection(conn);
            });
        });

        return this.pendingOpen;
    }

    acceptIncomingConnection(conn) {
        this.setupConnection(conn, { fromGuest: true });
        const guestName =
            (conn.metadata && conn.metadata.name) ||
            `Guest-${(conn.peer || '').toString().slice(-4) || 'user'}`;

        this.addPlayer(conn.peer, guestName, 'guest');
        this.sendLobbyJoined(conn);
        this.broadcastLobbyUpdate();
        this.emit('lobby_update', { players: this.serializePlayers() });
    }

    setupConnection(conn, { fromGuest = false } = {}) {
        this.connections.set(conn.peer, conn);

        conn.on('data', (data) => this.handleData(conn, data, { fromGuest }));

        conn.on('close', () => {
            this.handleDisconnect(conn, { fromGuest });
        });

        conn.on('error', (err) => {
            this.emit('error', { message: err?.message || 'Peer connection error.' });
        });
    }

    handleDisconnect(conn, { fromGuest = false } = {}) {
        this.connections.delete(conn.peer);

        if (fromGuest && this.players.has(conn.peer)) {
            this.players.delete(conn.peer);
            this.broadcastLobbyUpdate();
            this.emit('lobby_update', { players: this.serializePlayers() });
        }

        if (!fromGuest) {
            // Host connection dropped for guest
            this.emit('error', { message: 'Disconnected from host.' });
            this.emit('lobby_update', { players: [] });
            this.teardown();
        }
    }

    handleData(conn, data, { fromGuest = false } = {}) {
        if (!data || typeof data !== 'object') return;

        if (fromGuest) {
            this.handleDataFromGuest(conn, data);
        } else {
            this.handleDataFromHost(conn, data);
        }
    }

    handleDataFromGuest(conn, data) {
        switch (data.type) {
            case 'join': {
                this.addPlayer(conn.peer, data.name, 'guest', { ready: false });
                this.sendLobbyJoined(conn);
                this.broadcastLobbyUpdate();
                this.emit('lobby_update', { players: this.serializePlayers() });
                break;
            }
            case 'ready': {
                const player = this.players.get(conn.peer);
                if (player) {
                    player.ready = !!data.ready;
                    this.broadcastLobbyUpdate();
                    this.emit('lobby_update', { players: this.serializePlayers() });
                }
                break;
            }
            case 'chat': {
                this.forwardChatFrom(conn.peer, data.text);
                break;
            }
            case 'start_game': {
                this.broadcast('game_start', {});
                this.emit('game_start');
                break;
            }
            case 'game_state': {
                this.broadcast('game_state', data.state || {});
                break;
            }
            case 'dealer_action': {
                this.emit('dealer_action', { action: data.action, from: conn.peer });
                break;
            }
            case 'player_action': {
                this.emit('player_action', { action: data.action, from: conn.peer });
                break;
            }
            case 'leave': {
                this.handleDisconnect(conn, { fromGuest: true });
                break;
            }
            default:
                break;
        }
    }

    handleDataFromHost(_conn, data) {
        switch (data.type) {
            case 'lobby_joined':
                this.emit('lobby_joined', {
                    code: data.code || this.hostId,
                    players: data.players || [],
                });
                break;
            case 'lobby_update':
                this.emit('lobby_update', { players: data.players || [] });
                break;
            case 'chat_message':
                this.emit('chat_message', { from: data.from || 'Player', text: data.text || '' });
                break;
            case 'game_start':
                this.emit('game_start');
                break;
            case 'game_state':
                this.emit('game_state', data.state || {});
                break;
            case 'error':
                this.emit('error', { message: data.message || 'Host error.' });
                break;
            default:
                break;
        }
    }

    sendLobbyJoined(conn) {
        if (!conn || !conn.open) return;
        conn.send({ type: 'lobby_joined', code: this.hostId, players: this.serializePlayers() });
    }

    broadcastLobbyUpdate() {
        this.broadcast('lobby_update', { players: this.serializePlayers() });
    }

    broadcast(type, payload = {}) {
        this.connections.forEach((conn) => {
            if (conn.open) {
                conn.send({ type, ...payload });
            }
        });
    }

    forwardChatFrom(peerId, text) {
        const messageText = (text || '').toString();
        if (!messageText.trim()) return;
        const from = this.players.get(peerId)?.name || 'Player';
        const payload = { from, text: messageText };
        this.emit('chat_message', payload);
        this.broadcast('chat_message', payload);
    }

    async createLobby(name) {
        // Fresh peer with deterministic numeric code so the existing UI can reuse the 6-digit join form.
        const lobbyCode = this.generateCode();
        await this.ensureConnection(lobbyCode);

        this.isHost = true;
        this.hostId = lobbyCode;
        this.players.clear();
        this.addPlayer(this.selfId, name || this.playerName, 'host', { ready: true });

        this.emit('lobby_created', { code: lobbyCode, players: this.serializePlayers() });
    }

    async joinLobby(code, name) {
        const lobbyCode = (code || '').toString();
        await this.ensureConnection();
        this.isHost = false;
        this.hostId = lobbyCode;

        return new Promise((resolve, reject) => {
            const conn = this.peer.connect(lobbyCode, {
                metadata: { name: name || this.playerName, role: 'guest' },
            });
            this.hostConn = conn;
            this.setupConnection(conn, { fromGuest: false });

            const timeout = setTimeout(() => {
                reject(new Error('Join timeout'));
            }, 12000);

            conn.on('open', () => {
                clearTimeout(timeout);
                conn.send({ type: 'join', name: name || this.playerName });
                resolve();
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                this.emit('error', { message: err?.message || 'Failed to connect to host.' });
                reject(err);
            });

            conn.on('close', () => clearTimeout(timeout));
        });
    }

    chat(text) {
        const messageText = (text || '').toString();
        if (!messageText.trim()) return;

        if (this.isHost) {
            this.forwardChatFrom(this.selfId, messageText);
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'chat', text: messageText });
        }
    }

    startGame() {
        if (this.isHost) {
            this.broadcast('game_start', {});
            this.emit('game_start');
            return;
        }

        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'start_game' });
        }
    }

    sendGameState(state = {}) {
        if (!this.isHost) return;
        this.broadcast('game_state', { state });
    }

    sendPlayerAction(action) {
        if (this.isHost) return;
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'player_action', action });
        }
    }

    sendDealerAction(action) {
        if (this.isHost) return;
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'dealer_action', action });
        }
    }

    setReady(ready) {
        if (this.isHost) return;
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'ready', ready: !!ready });
        }
    }

    leaveLobby() {
        if (this.isHost) {
            // Let guests know the lobby closed
            this.broadcast('error', { message: 'Host closed the lobby.' });
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'leave' });
        }
        this.teardown();
    }

    teardown() {
        this.connections.forEach((conn) => {
            try {
                conn.close();
            } catch (_) {
                /* noop */
            }
        });
        this.connections.clear();
        this.players.clear();
        this.hostConn = null;
        this.hostId = null;
        this.isHost = false;

        if (this.peer && !this.peer.destroyed) {
            try {
                this.peer.destroy();
            } catch (_) {
                /* noop */
            }
        }
        this.peer = null;
        this.pendingOpen = null;
        this.status = 'disconnected';
    }
}

window.PeerLobbyClient = PeerLobbyClient;

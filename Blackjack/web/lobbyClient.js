class LobbyClient {
    constructor({ url }) {
        this.url = url;
        this.ws = null;
        this.status = 'disconnected';
        this.handlers = {};
        this.pendingOpen = null;
        this.playerName = `Player-${Math.random().toString(36).slice(2, 6)}`;
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
    }

    ensureConnection() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.pendingOpen) return this.pendingOpen;

        this.pendingOpen = new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);
            this.status = 'connecting';

            this.ws.onopen = () => {
                this.status = 'connected';
                this.pendingOpen = null;
                resolve();
            };

            this.ws.onclose = () => {
                this.status = 'disconnected';
                this.emit('disconnected');
            };

            this.ws.onerror = (err) => {
                this.status = 'disconnected';
                this.pendingOpen = null;
                reject(err);
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.emit(msg.type, msg);
                } catch (err) {
                    console.warn('Bad message', err);
                }
            };
        });

        return this.pendingOpen;
    }

    send(type, payload = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({ type, payload }));
    }

    async createLobby(name) {
        await this.ensureConnection();
        this.send('create_lobby', { name: name || this.playerName });
    }

    async joinLobby(code, name) {
        await this.ensureConnection();
        this.send('join_lobby', { code, name: name || this.playerName });
    }

    chat(text) {
        this.send('chat_message', { text });
    }

    startGame() {
        this.send('start_game', {});
    }

    leaveLobby() {
        this.send('leave_lobby', {});
    }
}

window.LobbyClient = LobbyClient;

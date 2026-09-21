// ======================
// MULTIPLAYER SYSTEM
// ======================
class MultiplayerManager {
    constructor() {
        this.isHost = false;
        this.isConnected = false;
        this.playerName = '';
        this.lobbyCode = '';
        this.connection = null;
        this.connectedPlayers = new Map();
        this.availableLobbies = [];
        this.playerRole = null;
        this.peer = null;
        this.connections = new Map();

        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        document.getElementById('hostLobbyBtn').addEventListener('click', () => this.hostLobby());
        document.getElementById('joinRandomBtn').addEventListener('click', () => this.joinRandomLobby());
        document.getElementById('joinLobbyBtn').addEventListener('click', () => this.joinLobby());
        document.getElementById('backToMainBtn').addEventListener('click', () => this.backToMain());
        document.getElementById('startMultiplayerGame').addEventListener('click', () => this.startGame());

        // Chat controls
        document.getElementById('toggleChat').addEventListener('click', () => {
            const chat = document.getElementById('chatContainer');
            const currentDisplay = chat.style.display;
            const isHidden = currentDisplay === 'none' || (!currentDisplay && window.getComputedStyle(chat).display === 'none');
            chat.style.display = isHidden ? 'block' : 'none';
        });

        document.getElementById('sendChat').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
    }

    async initializePeerJS() {
        // Create a new Peer
        this.peer = new Peer();

        return new Promise((resolve, reject) => {
            this.peer.on('open', (id) => {
                console.log('PeerJS connected with ID:', id);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                reject(err);
            });
        });
    }

    // Änderung in der hostLobby-Methode
    async hostLobby() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.showCustomAlert('Please enter your name first!');
            return;
        }

                    try {
                            if (this.peer) {
                                    this.peer.destroy();
                            }

                        // No config override. PeerJS 1.4.7 ships both STUN
                        // servers AND a free TURN relay in its own
                        // util.defaultConfig; replacing it with a STUN-only
                        // list actively deleted the relay, so behind
                        // symmetric NAT the connection simply could not be
                        // made -- and it looked exactly like a code bug.
                        this.peer = new Peer({ debug: 3 });
                        this.registerPeerEvents();

            const peerId = await new Promise((resolve, reject) => {
                this.peer.on('open', resolve);
                this.peer.on('error', reject);
                setTimeout(() => reject('PeerJS initialization timeout'), 15000);
            });

            // Store the full peer ID
                            this.lobbyCode = peerId;
                            this.playerName = playerName;
                            this.playerRole = 'host';

                            // Ensure the local player list always starts clean
                            this.connections.clear();
                            this.connectedPlayers.clear();
                            this.connectedPlayers.set(this.peer.id, {
                                    id: this.peer.id,
                                    name: this.playerName,
                                    role: 'host',
                                    status: 'connected'
                            });

            // Update UI - MAKE SURE THIS ELEMENT EXISTS
            const lobbyDisplay = document.getElementById('lobbyCodeDisplay');
            if (lobbyDisplay) {
                lobbyDisplay.value = peerId;
            } else {
                console.error('lobbyCodeDisplay element not found!');
                // Fallback: Show alert with the code
                this.showCustomAlert(`Lobby created! Code: ${peerId}`);
            }

            // Set up connection handler
                            this.peer.on('connection', (conn) => {
                                    console.log('Incoming connection:', conn.peer);
                                    this.setupConnection(conn);
                            });

                            this.isHost = true;
                            this.isConnected = true;
                            this.updateUI();

                            // Allow the host to access the chat immediately
                            document.getElementById('toggleChat').style.display = 'block';

                    } catch (error) {
            console.error('Failed to host lobby:', error);
            if (this.peer) this.peer.destroy();
            this.showCustomAlert(`Failed to create lobby: ${error}`);
        }
    }

    lobbyCodeToPeerId(lobbyCode) {
        // Since we create lobby codes from the first 6 characters of peer ID,
        // we need the full peer ID to connect. In a real implementation,
        // you'd have a server to map codes to full peer IDs.
        // For this demo, we'll assume the full peer ID is available
        // This is a limitation of the current implementation
        return lobbyCode.trim();
    }

    // 'disconnected' means the SIGNALLING server dropped while the
    // peer-to-peer DataChannel is very probably still fine, so reconnect
    // quietly and do NOT pause the game. Neither event was registered
    // anywhere before, so a broker drop was completely silent.
    registerPeerEvents() {
        if (!this.peer || this._peerEventsBound) return;
        this._peerEventsBound = true;

        this.peer.on('disconnected', () => {
            console.warn('Signalling server dropped; reconnecting');
            try { this.peer.reconnect(); } catch (e) { /* already destroyed */ }
        });

        this.peer.on('close', () => {
            this.handlePeerLost(null);
        });
    }

    handlePeerLost(peerId) {
        if (!gameConfig.isMultiplayer) return;
        if (this.connections.size > 0) return;      // someone is still here

        gameConfig.isMultiplayer = false;
        gameConfig.playerRole = 'single';           // whoever is left continues alone
        showDialog(
            'Der andere Spieler ist weg. Der Durchlauf geht allein weiter, Gold und Leben bleiben wie sie sind.',
            'Verbindung verloren');
        updateUI();
    }

    setupConnection(conn) {
        // Register the connection unconditionally and immediately. This used
        // to live inside conn.on('open'), but the guest calls setupConnection
        // from inside its own already-fired 'open' handler, and PeerJS does
        // not replay 'open' to a late subscriber. So the guest's send map
        // stayed empty forever: it could receive, but broadcastMessage()
        // iterated nothing and every message it sent vanished silently.
        this.connections.set(conn.peer, conn);

        const onOpen = () => {
            console.log('Connection established with:', conn.peer);

            // Send welcome message with our info
            this.sendMessageToConnection(conn, {
                type: 'playerInfo',
                peerId: this.peer.id,
                playerName: this.playerName,
                role: this.playerRole
            });

            // Update player list if we're host
            if (this.isHost) {
                this.connectedPlayers.set(conn.peer, {
                    id: conn.peer,
                    name: conn.metadata?.playerName || 'Guest',
                    role: 'guest',
                    status: 'connected'
                });
                this.updatePlayerList();
            }
        };

        // Covers both call sites: the host subscribes before 'open' fires,
        // the guest arrives after it already has.
        if (conn.open) onOpen(); else conn.on('open', onOpen);

        // Handle incoming messages
        conn.on('data', (data) => this.handleMessage(data, conn.peer));

        conn.on('close', () => {
            console.log('Connection closed with:', conn.peer);
            this.connections.delete(conn.peer);
            this.connectedPlayers.delete(conn.peer);
            this.updatePlayerList();
            // A closed DataChannel is the one that actually pauses the run.
            // Losing the signalling server does not -- see registerPeerEvents.
            this.handlePeerLost(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('Connection error with', conn.peer, ':', err);
        });
    }

    findHostPeerId(lobbyCode) {
        // In a real implementation, you'd look up the peer ID from the lobby code
        // For this demo, we'll just use the lobby code directly (since we're not using a server)
        return lobbyCode.trim();
    }

    joinRandomLobby() {
        showDialog('Zufälliges Beitreten gibt es noch nicht. Nutze einen Lobby-Code.', 'Noch nicht da');
    }

    async joinLobby() {
        const playerName = document.getElementById('playerName').value.trim();
        const lobbyCodeInput = document.getElementById('lobbyCode').value.trim();

        if (!playerName) {
            this.showCustomAlert('Please enter your name first!');
            return;
        }

        if (!lobbyCodeInput) {
            this.showCustomAlert('Please enter a lobby code!');
            return;
        }

        try {
            console.log('Joining lobby with code:', lobbyCodeInput);

            // Check if PeerJS is available
            if (typeof Peer === 'undefined') {
                throw new Error('PeerJS library not loaded. Please check your internet connection.');
            }

            // Initialize PeerJS
            // Same here: no config override, so the default TURN relay stays.
            this.peer = new Peer({
                debug: 3,
                iceTransportPolicy: "all"
            });
            this.registerPeerEvents();

            const peerId = await new Promise((resolve, reject) => {
                let resolved = false;

                this.peer.on('open', (id) => {
                    if (!resolved) {
                        resolved = true;
                        resolve(id);
                    }
                });

                this.peer.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        reject(err);
                    }
                });

                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Connection timeout'));
                    }
                }, 15000);
            });

            this.playerName = playerName;
            this.isHost = false;
            this.playerRole = 'guest';

            // Convert lobby code back to host peer ID
            //const hostPeerId = this.lobbyCodeToPeerId(lobbyCode);
                            this.hostPeerId = lobbyCodeInput;
            const hostPeerId = lobbyCodeInput; // Expect full ID
                            console.log("Connecting to:", hostPeerId); // Debug log

            // Connect to host
            const conn = this.peer.connect(hostPeerId, {
                reliable: true,
                metadata: {
                    playerName: playerName,
                    role: 'guest'
                }
            });

            // Setup connection
            await new Promise((resolve, reject) => {
                let resolved = false;

                conn.on('open', () => {
                    if (!resolved) {
                        resolved = true;
                        console.log('Connected to host successfully');
                        this.setupConnection(conn);
                        resolve();
                    }
                });

                conn.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        console.error('Connection error:', err);
                        reject(new Error('Failed to connect to lobby. Please check the code and try again.'));
                        this.showCustomAlert('Connection failed. Please check the lobby code and try again.', 'Error');
                    }
                });

                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Connection timeout. Host might be offline.'));
                    }
                }, 10000);
            });

            // Add self to player list
            this.connectedPlayers.set(peerId, {
                id: peerId,
                name: playerName,
                role: 'guest',
                status: 'connected'
            });

            this.lobbyCode = hostPeerId;
            this.isConnected = true;
            this.updateUI();
            this.showCustomAlert(`Successfully joined lobby: ${hostPeerId}`, 'Success');

            // Show chat controls
            document.getElementById('toggleChat').style.display = 'block';

        } catch (error) {
            console.error('Failed to join lobby:', error);
            this.showCustomAlert(`Failed to join lobby: ${error.message}`, 'Error');

            // Cleanup on error
            if (this.peer) {
                this.peer.destroy();
                this.peer = null;
            }
            this.isConnected = false;
            this.updateUI();
        }
    }

    joinSpecificLobby(lobbyCode, playerName) {
        this.playerName = playerName;
        this.lobbyCode = lobbyCode;
        this.isHost = false;
        this.isConnected = true;
        this.playerRole = 'guest';

        // Simulate joining
        this.connectedPlayers.set('guest', {
            name: playerName,
            role: 'guest',
            status: 'connected'
        });

        // Simulate host already being there
        this.connectedPlayers.set('host', {
            name: 'Host Player',
            role: 'host',
            status: 'connected'
        });

        this.updateUI();
        showDialog(`Lobby beigetreten: ${lobbyCode}`, "Verbunden");
    }

    backToMain() {
        // Cleanup connections
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.connections.clear();
        this.connectedPlayers.clear();

        // Reset state
        this.isHost = false;
        this.isConnected = false;
        this.lobbyCode = '';
        this.playerRole = null;

        // Hide UI elements
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('titleScreen').style.display = 'flex';
        document.getElementById('toggleChat').style.display = 'none';

        this.updateUI();
    }

    updateLobbyList() {
        const container = document.getElementById('lobbyListContainer');

        if (this.availableLobbies.length === 0) {
            container.innerHTML = '<div class="lobby-item">No lobbies available</div>';
            return;
        }

        container.innerHTML = '';
        this.availableLobbies.forEach(lobby => {
            const item = document.createElement('div');
            item.className = 'lobby-item';
            item.innerHTML = `
                <div>Code: ${lobby.code}</div>
                <div>Host: ${lobby.host}</div>
                <div>Players: ${lobby.players}/${lobby.maxPlayers}</div>
            `;
            item.addEventListener('click', () => {
                document.getElementById('lobbyCode').value = lobby.code;
            });
            container.appendChild(item);
        });
    }

    updatePlayerList() {
        const container = document.getElementById('playerListContainer');

        if (this.connectedPlayers.size === 0) {
            container.innerHTML = '<div class="player-item"><span>No players connected</span></div>';
            return;
        }

        container.innerHTML = '';
        this.connectedPlayers.forEach((player) => {
            const item = document.createElement('div');
            item.className = 'player-item';

            item.innerHTML = `
                <span>${player.name}</span>
                <span class="player-status">
                    ${player.role === 'host' ? 'Host' : 'Guest'}
                </span>
            `;
            container.appendChild(item);
        });
    }

    updateUI() {
        // Update connection status
        const statusEl = document.getElementById('connectionStatus');
        if (this.isConnected) {
            statusEl.textContent = `Connected - ${this.isHost ? 'Hosting' : 'Guest'} - Code: ${this.lobbyCode}`;
            statusEl.style.color = '#27ae60';
        } else {
            statusEl.textContent = 'Disconnected';
            statusEl.style.color = '#e74c3c';
        }

        // Update player list
        this.updatePlayerList();

        // Show/hide host controls
        const hostControls = document.getElementById('hostControls');
        if (this.isHost && this.isConnected) {
            hostControls.style.display = 'block';
        } else {
            hostControls.style.display = 'none';
        }
    }

    // (Removed: a second sendMessage() used to sit here, shadowed by the real
    // one further down the class. It faked a 100 ms local loopback of every
    // message back into this peer's own handleMessage -- so reordering or
    // deleting the real one would have made every tower placement duplicate
    // itself and every wave start twice. Exactly the class of symptom that
    // was being chased, sitting 230 lines from its replacement with nothing
    // marking it obsolete.)

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        // Display locally
        this.displayChatMessage(this.playerName, message);

        // Broadcast to others
        this.broadcastMessage({
            type: 'chat',
            sender: this.playerName,
            message: message
        });

        input.value = '';
    }

    sendMessageToConnection(conn, message) {
        try {
            if (conn && conn.open) {
                conn.send(message);
            } else {
                console.warn('Attempted to send message to closed connection');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    broadcastMessage(message, excludePeerId = null) {
        this.connections.forEach((conn, peerId) => {
            if (peerId !== excludePeerId && conn.open) {
                this.sendMessageToConnection(conn, message);
            }
        });
    }

    displayChatMessage(sender, message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');

        // Both halves used to be interpolated straight into innerHTML, so
        // anything a peer sent was parsed as markup on the other machine.
        const who = document.createElement('strong');
        who.textContent = sender + ':';
        messageElement.appendChild(who);
        messageElement.appendChild(document.createTextNode(' ' + message));

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    handleMessage(message, fromPeer) {
        // Only peers we actually hold a connection to.
        if (!this.connections.has(fromPeer)) return;
        // The guest accepts truth only from the host.
        if (!this.isHost && this.hostPeerId && fromPeer !== this.hostPeerId) return;

        // Removed entirely, because each was a hole rather than a feature:
        //   towerPlaced   pushed a remote tower with no validation and no cost
        //                 -- a free tower anywhere, including on the path.
        //   towerUpgraded blanket-assigned upgrades with no cost and no cap,
        //                 finding the tower by float coordinate equality.
        //   waveStarted   instructed the guest to run its own startWave().
        //   gameState     set lives to an arbitrary number with no bound and
        //                 no direction check, which is why lives could go UP.
        switch (message.type) {
            case 'playerInfo':
                this.connectedPlayers.set(message.peerId, {
                    id: message.peerId,
                    name: message.playerName,
                    role: message.role,
                    status: 'connected'
                });
                this.updatePlayerList();
                break;

            case 'chat':
                this.displayChatMessage(message.sender, message.message);
                break;

            case 'intent':
                // Host only, and only from a peer it recognises as a guest.
                if (!this.isHost) break;
                {
                    const res = applyIntent(message.data.type, message.data.data, 'guest');
                    const conn = this.connections.get(fromPeer);
                    if (conn) this.sendMessageToConnection(conn, { type: 'intentResult', data: res });
                }
                break;

            case 'intentResult':
                if (!message.data.ok && message.data.reason) {
                    showDialog(message.data.reason, 'Geht nicht');
                }
                break;

            case 'towerState':
                if (this.isHost) break;
                applyTowerState(message.data);
                break;

            case 'snapshot':
                if (this.isHost) break;
                applySnapshot(message.data);
                break;

            case 'gameOver':
                if (this.isHost) break;
                gameState.phase = message.data.won ? 'won' : 'over';
                showDialog(message.data.text, message.data.won ? 'Gewonnen' : 'Verloren', resetToTitle);
                break;

            case 'gameStart':
                document.getElementById('multiplayerMenu').style.display = 'none';
                document.getElementById('titleScreen').style.display = 'none';
                document.getElementById('startButton').style.display = 'block';
                document.getElementById('startButton').style.pointerEvents = 'auto';

                // These four reads used a bare `data`, which is not a
                // parameter of handleMessage and is declared nowhere in the
                // file -- so the guest threw a ReferenceError here, never
                // reached initGame() below, and sat on a blank green canvas.
                gameConfig.isMultiplayer = true;
                gameConfig.playerRole = 'guest';
                gameConfig.map = message.data.map;
                gameConfig.difficulty = message.data.difficulty;

                initGame();
                startLoop();
                break;
        }
    }

    // JavaScript für benutzerdefinierte Alerts
    showCustomAlert(message, title = 'Alert') {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';

        const alertBox = document.createElement('div');
        alertBox.className = 'custom-alert';
        alertBox.innerHTML = `
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="custom-alert-buttons">
                <button class="custom-alert-btn retry">OK</button>
            </div>
        `;

        const okBtn = alertBox.querySelector('.retry');
        okBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(alertBox);
        });

        document.body.appendChild(overlay);
        document.body.appendChild(alertBox);
    }





    startGame() {
        if (!this.isHost) {
            this.showCustomAlert('Only the host can start the game!');
            return;
        }

        // Count only connected guests (excluding host)
        const connectedPlayers = [...this.connectedPlayers.values()].filter(p => p.role === 'guest');

        if (connectedPlayers.length < 1) {
            this.showCustomAlert('Need at least 1 other player to start!');
            return;
        }

        // Hide menus and show game UI for host
        document.getElementById('multiplayerMenu').style.display = 'none';
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('startButton').style.display = 'block';
        document.getElementById('startButton').style.pointerEvents = 'auto';

        // Initialize multiplayer game
        gameConfig.isMultiplayer = true;
        gameConfig.playerRole = this.playerRole;
        gameConfig.connectedPlayers = this.connectedPlayers;

        // Broadcast game start. This went out raw, with the fields at top
        // level, while every other message goes through sendMessage() and is
        // wrapped as {type, data, timestamp} -- which is the envelope the
        // handler was written for.
        this.sendMessage('gameStart', {
            map: gameConfig.map,
            difficulty: gameConfig.difficulty
        });

        // Start game for host
        initGame();
        startLoop();
    }

    // Send multiplayer game events
    sendMessage(type, data) {
        this.broadcastMessage({
            type: type,
            data: data,
            timestamp: Date.now()
        });
    }    
}

// Create multiplayer manager instance
const multiplayerManager = new MultiplayerManager();

// ======================
// GAME CONFIGURATION
// ======================
let gameConfig = {
    difficulty: 'easy',
    map: 1,
    unlockedMaps: [1],
    unlockedDifficulties: ['easy'],
    isMultiplayer: false,
    playerRole: null,
    connectedPlayers: null,
    difficulties: {
        easy: { gold: 300, enemyHpMultiplier: 2.0 },
        medium: { gold: 200, enemyHpMultiplier: 3.5 },
        hard: { gold: 150, enemyHpMultiplier: 5.0 }
    }
};

// Enemy tier system - T1 (green) to T5 (black)
const enemyTiers = [
    {   // T1 - Green (weakest)
        name: "T1 Grunt",
        color: "#4CAF50",
        hp: 50,
        speed: 1.4,
        goldValue: 10,
        tier: 1
    },
    {   // T2 - Blue
        name: "T2 Soldier",
        color: "#2196F3",
        hp: 120,
        speed: 1.1,
        goldValue: 20,
        tier: 2
    },
    {   // T3 - Purple
        name: "T3 Elite",
        color: "#9C27B0",
        hp: 250,
        speed: 0.9,
        goldValue: 35,
        tier: 3
    },
    {   // T4 - Red
        name: "T4 Champion",
        color: "#F44336",
        hp: 450,
        speed: 0.7,
        goldValue: 55,
        tier: 4
    },
    {   // T5 - Black (strongest)
        name: "T5 Boss",
        color: "#212121",
        hp: 800,
        speed: 0.5,
        goldValue: 80,
        tier: 5
    }
];

// ======================
// MENU EVENT LISTENERS
// ======================

// Multiplayer button event listener
document.querySelector('.multiplayer-btn').addEventListener('click', function() {
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('multiplayerMenu').style.display = 'flex';
});

// Title screen logic (difficulty and map selection)
// ======================
// PROGRESSION
// ======================
// index.html used to hardcode class="locked" on five maps and two
// difficulties, and NOTHING in the project ever removed it -- so setupMap2
// through setupMap6 were complete, dispatched from two switch statements,
// and permanently unreachable. Lock state is derived from config now, and
// the config is persisted.
const SAVE_KEY = 'lot-progress-v1';

function loadProgress() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (Array.isArray(p.maps) && p.maps.length) gameConfig.unlockedMaps = p.maps;
        if (Array.isArray(p.diffs) && p.diffs.length) gameConfig.unlockedDifficulties = p.diffs;
    } catch (e) {
        // file:// or a private window throws; an unlocked-nothing run is fine
    }
}

function saveProgress() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            maps: gameConfig.unlockedMaps,
            diffs: gameConfig.unlockedDifficulties
        }));
    } catch (e) { /* storage unavailable; progress is just not kept */ }
}

// Clearing a map unlocks the next one, and clearing anything on easy unlocks
// medium. Hard stays locked until medium is cleared -- nobody has ever played
// either, so they are gated behind evidence rather than handed out.
function recordWin() {
    const next = gameConfig.map + 1;
    if (next <= 6 && !gameConfig.unlockedMaps.includes(next)) gameConfig.unlockedMaps.push(next);

    const d = gameConfig.unlockedDifficulties;
    if (gameConfig.difficulty === 'easy'   && !d.includes('medium')) d.push('medium');
    if (gameConfig.difficulty === 'medium' && !d.includes('hard'))   d.push('hard');

    saveProgress();
    refreshLockUI();
}

function refreshLockUI() {
    document.querySelectorAll('[data-map]').forEach(b => {
        const open = gameConfig.unlockedMaps.includes(parseInt(b.dataset.map));
        b.classList.toggle('locked', !open);
        b.disabled = !open;                       // styles.css gives .locked only
        b.setAttribute('aria-disabled', String(!open));  // cursor:not-allowed, so the
    });                                           // hover glow still fired without this
    document.querySelectorAll('[data-difficulty]').forEach(b => {
        const open = gameConfig.unlockedDifficulties.includes(b.dataset.difficulty);
        b.classList.toggle('locked', !open);
        b.disabled = !open;
        b.setAttribute('aria-disabled', String(!open));
    });
}

loadProgress();
refreshLockUI();

document.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!gameConfig.unlockedDifficulties.includes(this.dataset.difficulty)) return;
        document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        gameConfig.difficulty = this.dataset.difficulty;
    });
});

document.querySelectorAll('[data-map]').forEach(btn => {
    btn.addEventListener('click', function() {
        const mapNum = parseInt(this.dataset.map);
        if (!gameConfig.unlockedMaps.includes(mapNum)) return;

        document.querySelectorAll('[data-map]').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        gameConfig.map = mapNum;
    });
});

// ======================
// FIXED TIMESTEP LOOP
// ======================
// The simulation advances in fixed 1/60 s steps, so the game runs at the same
// speed on a 60 Hz and a 144 Hz monitor. Rendering still happens once per
// animation frame, at whatever rate the display offers.
//
// Every cooldown in the game is measured against simTime, which only advances
// inside a step. Nothing in the simulation reads Date.now() any more.
const STEP_MS = 1000 / 60;
let simTime = 0;
let accumulator = 0;
let lastFrameTime = null;   // null, not 0 -- a timestamp of 0 is legitimate
let rafHandle = null;

function mainLoop(frameTime) {
    rafHandle = requestAnimationFrame(mainLoop);

    const now = (frameTime === undefined) ? performance.now() : frameTime;
    if (lastFrameTime === null) lastFrameTime = now;

    // Clamp so an alt-tab or a breakpoint does not teleport the wave forward
    // on resume; the 5-step cap bounds catch-up work per frame.
    accumulator += Math.min(now - lastFrameTime, 250);
    lastFrameTime = now;

    let steps = 0;
    while (accumulator >= STEP_MS && steps++ < 5) {
        if (isAuthority()) {
            stepSimulation(STEP_MS);
            simTick++;
            // 15 Hz, scheduled by the simulation clock rather than a second
            // timer that could drift against it.
            if (simTick % SNAPSHOT_EVERY === 0) sendSnapshot();
        } else {
            updateGuest(STEP_MS);
        }
        accumulator -= STEP_MS;
    }

    syncUIFromState();
    draw();
}

// Guarded so a second Start click cannot spawn a parallel rAF chain.
function startLoop() {
    if (rafHandle !== null) return;
    lastFrameTime = null;
    accumulator = 0;
    rafHandle = requestAnimationFrame(mainLoop);
}

function stopLoop() {
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    rafHandle = null;
    lastFrameTime = null;
    accumulator = 0;
}

// Update function to handle game logic
document.querySelector('.start-btn').addEventListener('click', function() {
    // Explicit, rather than relying on null falling through to the host
    // branch -- playerRole was only ever assigned 'host' or 'guest'.
    gameConfig.isMultiplayer = false;
    gameConfig.playerRole = 'single';
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('startButton').style.display = 'block';
    document.getElementById('startButton').style.pointerEvents = 'auto';
    initGame();
    startLoop();
});

// Resize is handled by the single listener registered at the bottom of the file.

// Initialize the game with selected settings
async function initGame() {
    resetGame();

    const difficulty = gameConfig.difficulties[gameConfig.difficulty];
    // Both players start with the full amount; the run is not made twice as
    // rich because the enemies are shared and each purse only buys its own
    // towers onto one board.
    purses = { host: difficulty.gold, guest: difficulty.gold, single: difficulty.gold };
    gameState.gold = difficulty.gold;
    gameState.phase = 'playing';

    document.body.classList.remove('in-title-screen');

    // Select map based on choice
    switch(gameConfig.map) {
        case 1: setupMap1(); break;
        case 2: setupMap2(); break;
        case 3: setupMap3(); break;
        case 4: setupMap4(); break;
        case 5: setupMap5(); break;
        case 6: setupMap6(); break;
    }

    if (gameConfig.isMultiplayer) {
        // Show player indicators
        document.getElementById('playerIndicators').style.display = 'block';

        // Host is player 1, guest is player 2
        if (gameConfig.playerRole === 'host') {
            gameState.playerNumber = 1;
        } else {
            gameState.playerNumber = 2;
        }
    }

    // Initialize tower bar
    setupTowerBar();

    updateUI();
    resizeCanvas(); // Important for correct display

    try {
        await preloadTowerIcons();
        console.log("All tower icons loaded");
    } catch (error) {
        console.error("Failed to load tower icons:", error);
        // Fallback: will use colored rectangles instead of icons
    }
}

// Path variable that will be used by all map functions
let path = [];

function setupMap1() {
    // Scale coordinates to fit game canvas
    const scaleX = GAME_WIDTH / 1600;
    const scaleY = GAME_HEIGHT / 900;

    path = [
        {x: 100 * scaleX, y: 200 * scaleY}, 
        {x: 600 * scaleX, y: 200 * scaleY}, 
        {x: 600 * scaleX, y: 400 * scaleY}, 
        {x: 400 * scaleX, y: 400 * scaleY},
        {x: 400 * scaleX, y: 600 * scaleY}, 
        {x: 800 * scaleX, y: 600 * scaleY},
        {x: 800 * scaleX, y: 350 * scaleY}, 
        {x: 1200 * scaleX, y: 350 * scaleY},
        {x: 1200 * scaleX, y: 750 * scaleY}, 
        {x: 1500 * scaleX, y: 750 * scaleY}
    ];
    generateMapElements();
}

function setupMap2() {
    const scaleX = GAME_WIDTH / 1600;
    const scaleY = GAME_HEIGHT / 900;

    path = [
        {x: 100 * scaleX, y: 450 * scaleY}, 
        {x: 100 * scaleX, y: 150 * scaleY}, 
        {x: 700 * scaleX, y: 150 * scaleY}, 
        {x: 700 * scaleX, y: 350 * scaleY},
        {x: 300 * scaleX, y: 350 * scaleY}, 
        {x: 300 * scaleX, y: 650 * scaleY},
        {x: 1100 * scaleX, y: 650 * scaleY}, 
        {x: 1100 * scaleX, y: 250 * scaleY},
        {x: 500 * scaleX, y: 250 * scaleY}, 
        {x: 500 * scaleX, y: 750 * scaleY},
        {x: 1500 * scaleX, y: 750 * scaleY}
    ];
    generateMapElements();
}

function setupMap3() {
    const scaleX = GAME_WIDTH / 1600;
    const scaleY = GAME_HEIGHT / 900;

    path = [
        {x: 50 * scaleX, y: 850 * scaleY}, 
        {x: 300 * scaleX, y: 600 * scaleY},
        {x: 550 * scaleX, y: 850 * scaleY}, 
        {x: 800 * scaleX, y: 600 * scaleY},
        {x: 1050 * scaleX, y: 850 * scaleY}, 
        {x: 1300 * scaleX, y: 600 * scaleY},
        {x: 1550 * scaleX, y: 850 * scaleY}
    ];
    generateMapElements();
}

function setupMap4() {
    const scaleX = GAME_WIDTH / 400;  // Map4 has different dimensions (400x400)
    const scaleY = GAME_HEIGHT / 400;

    path = [
        {x: 20 * scaleX, y: 200 * scaleY}, 
        {x: 200 * scaleX, y: 200 * scaleY},
        {x: 200 * scaleX, y: 50 * scaleY}, 
        {x: 350 * scaleX, y: 50 * scaleY},
        {x: 350 * scaleX, y: 150 * scaleY}, 
        {x: 100 * scaleX, y: 150 * scaleY},
        {x: 100 * scaleX, y: 250 * scaleY}, 
        {x: 300 * scaleX, y: 250 * scaleY},
        {x: 300 * scaleX, y: 100 * scaleY}, 
        {x: 150 * scaleX, y: 100 * scaleY},
        {x: 150 * scaleX, y: 300 * scaleY}, 
        {x: 380 * scaleX, y: 300 * scaleY}
    ];
    generateMapElements();
}

function setupMap5() {
    const scaleX = GAME_WIDTH / 1600;
    const scaleY = GAME_HEIGHT / 900;

    path = [
        {x: 50 * scaleX, y: 100 * scaleY}, 
        {x: 550 * scaleX, y: 100 * scaleY},
        {x: 550 * scaleX, y: 300 * scaleY}, 
        {x: 1050 * scaleX, y: 300 * scaleY},
        {x: 1050 * scaleX, y: 500 * scaleY}, 
        {x: 1550 * scaleX, y: 500 * scaleY}
    ];
    generateMapElements();
}

function setupMap6() {
    const scaleX = GAME_WIDTH / 1600;
    const scaleY = GAME_HEIGHT / 900;

    path = [
        {x: 800 * scaleX, y: 100 * scaleY}, 
        {x: 1100 * scaleX, y: 100 * scaleY},
        {x: 1400 * scaleX, y: 450 * scaleY}, 
        {x: 1100 * scaleX, y: 800 * scaleY},
        {x: 800 * scaleX, y: 800 * scaleY}, 
        {x: 500 * scaleX, y: 450 * scaleY},
        {x: 800 * scaleX, y: 100 * scaleY}
    ];
    generateMapElements();
}

// Canvas and UI elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const towerMenu = document.getElementById('towerMenu');
const upgradeMenu = document.getElementById('upgradeMenu');
const startButton = document.getElementById('startButton');
const towerBar = document.getElementById('towerBar');

// Game variables
let mapElements = [];
const LIFE_MAX = 25;   // has to cover ten waves, not five
const MAX_WAVE = 10;
let enemiesPerWave = 10;
let selectedTower = null;
let draggingTower = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Game state
// phase drives the lifecycle: nothing simulates outside 'playing', and the
// HUD derives the Start button from it.
// A leak costs 1 life for T1-T2, 2 for T3-T4, 3 for a T5 Boss.
function leakCost(tier) { return tier >= 5 ? 3 : (tier >= 3 ? 2 : 1); }

// Total gold an enemy still pays from its current tier all the way down.
// The inspector used to show only the current tier's value, advertising
// "Gold Reward: 55" for a T4 that in fact pays 120 across the whole chain --
// and, before the kill pipeline was fixed, actually paid 10.
function chainGold(tier) {
    let sum = 0;
    for (let t = tier; t >= 1; t--) sum += enemyTiers[t - 1].goldValue;
    return sum;
}

let gameState = {
    phase: 'title',          // 'title' | 'playing' | 'won' | 'over'
    gold: 300,               // was a 200000 debug value that showed on the HUD
    crystals: 4,
    lives: LIFE_MAX,
    wave: 1,
    enemiesInWave: 0,
    enemiesLeft: 0,
    enemiesKilled: 0,
    enemiesLeaked: 0,
    enemiesTotal: 0,
    waveActive: false,
    nextWaveEnemies: 10
};

// initGame() only ever reset gold, which was invisible because the one restart
// path in the game was a full page reload. With a real win/lose screen the
// board has to actually come back to a clean state.
function resetGame() {
    towers.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    selectedTower = null;
    draggingTower = null;

    simTime = 0;
    simTick = 0;
    snapA = snapB = null;
    playoutOffset = null;
    guestStalled = false;
    lastSpawn = 0;
    nextEnemyId = 1;
    nextTowerId = 1;

    doctrines = {
        'Archer': false, 'Cannon': false, 'Mage': false,
        'Fire Tower': false, 'Ice Tower': false, 'Sniper': false,
    };
    gameState.crystals = 4;      // deterministic income from here on
    gameState.lives = LIFE_MAX;
    gameState.wave = 1;
    gameState.enemiesInWave = 0;
    gameState.enemiesLeft = 0;
    gameState.enemiesKilled = 0;
    gameState.enemiesLeaked = 0;
    gameState.enemiesTotal = 0;
    gameState.waveActive = false;
    gameState.nextWaveEnemies = enemiesPerWave;
}

function resetToTitle() {
    stopLoop();
    resetGame();
    gameState.phase = 'title';
    document.body.classList.add('in-title-screen');
    document.getElementById('titleScreen').style.display = 'flex';
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('gameContainer').style.display = '';
    if (gameConfig.isMultiplayer) multiplayerManager.backToMain();
}

// UI elements
const goldEl = document.getElementById('goldAmount');
const crystalEl = document.getElementById('crystalAmount');
const lifeEl = document.getElementById('lifeAmount');
const waveNumEl = document.getElementById('waveNumber');
const enemiesKilledEl = document.getElementById('enemiesKilled');

const towerIcons = {
    archer: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="arch1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#004d00"/><stop offset="100%" stop-color="#6f6"/></linearGradient><marker id="arch2" markerUnits="strokeWidth" markerWidth="4" markerHeight="4" refX="0" refY="2" orient="auto"><path d="m0 0 4 2-4 2Z" fill="#888"/></marker></defs><rect x="10" y="10" width="80" height="80" fill="url(#arch1)" stroke="#000" stroke-width="4" rx="16" ry="16"/><g fill="none" stroke="brown" stroke-width="4" stroke-linecap="round"><path d="M35 25v50M35 25a25 25 0 0 1 0 50" transform="matrix(.85 0 0 .85 3.25 7.5)"/><path stroke="#888" marker-end="url(#arch2)" d="M35 50h40" transform="matrix(.85 0 0 .85 3.25 7.5)"/></g></svg>`,
    cannon: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="canon1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#666"/><stop offset="100%" stop-color="#aaa"/></linearGradient></defs><rect x="10" y="10" width="80" height="80" fill="url(#canon1)" stroke="#000" stroke-width="4" rx="16" ry="16"/><circle cx="50" cy="55" r="20" fill="#111" stroke="#000" stroke-width="3"/><path stroke="#fc0" stroke-width="3" stroke-linecap="round" d="M50 35V25"/><path d="m50 23-3-3 2 5 5-2-4 2Z" fill="#fd4"/></svg>`,
    mage: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="mage1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="indigo"/><stop offset="100%" stop-color="#9370db"/></linearGradient><linearGradient id="mage2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ddd"/><stop offset="100%" stop-color="#888"/></linearGradient><radialGradient id="mage3" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#a0eaff"/><stop offset="100%" stop-color="#005fbb"/></radialGradient></defs><rect x="10" y="10" width="80" height="80" fill="url(#mage1)" stroke="#000" stroke-width="4" rx="16" ry="16"/><g transform="rotate(20 50 50)" stroke-linecap="round" stroke-linejoin="round"><path stroke="#ccc" stroke-width="3" d="M50 45v30m-5-20h10"/><path d="M48 45h4l2-5h-8Z" fill="url(#mage2)" stroke="#777"/><circle cx="50" cy="35" r="10" fill="url(#mage3)" stroke="#003f7f"/><path d="M50 25c10 0 15 10 7 15m-7-15c-10 0-15 10-7 15" stroke="#a0eaff" stroke-width="2" fill="none"/><path stroke="#a0eaff" stroke-width="2" d="m43 40-4 6"/><circle cx="38" cy="48" r="2" fill="#00ace6" stroke="#005fbb"/><path stroke="#a0eaff" stroke-width="2" d="m57 40 4 6"/><circle cx="62" cy="48" r="2" fill="#00ace6" stroke="#005fbb"/></g></svg>`,
    fire: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="fire1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="red"/><stop offset="100%" stop-color="orange"/></linearGradient><symbol id="b" viewBox="0 0 432 640"><g transform="matrix(.85 0 0 .85 -31.35 48)"/><path d="M165.214 571.337c4.185 2.224 8.599-2.593 6.037-6.58-13.906-21.644-27.075-58.063-6.094-104.967 34.987-78.216 56.277-118.726 56.277-118.726s11.324 47.275 42.02 89.31c29.544 40.454 45.714 91.334 19.645 133.72-2.447 3.978 1.867 8.671 6.025 6.544 32.27-16.508 68.464-49.62 72.548-115.512 1.505-20.135-.753-48.324-12.044-83.896-14.52-45.084-32.368-66.121-42.695-75.155-3.089-2.703-7.893-.308-7.64 3.789 3.01 48.646-15.291 60.99-25.708 33.17-4.16-11.112-6.586-30.33-6.586-53.736 0-38.966-11.305-79.077-36.229-111.672-6.48-8.476-14.065-16.397-22.766-23.15-3.15-2.447-7.716.012-7.427 3.99 1.913 26.414.18 102.119-66.237 192.561-60.22 83.896-36.885 148.328-28.605 165.779 15.831 33.43 37.913 53.064 59.479 64.53z" fill="#ff0" fill-rule="evenodd" stroke="#000" stroke-width="2.1"/></symbol></defs><rect x="10" y="10" width="80" height="80" fill="url(#fire1)" stroke="#000" stroke-width="4" rx="16" ry="16"/><svg x="10" y="10" width="80" height="80" viewBox="0 0 432 640"><use href="#b"/></svg></svg>`,
    ice: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="ice1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#007acc"/><stop offset="100%" stop-color="#a0e1ff"/></linearGradient><marker id="ice1" markerUnits="strokeWidth" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M2 0v4" stroke="#fff"/></marker></defs><rect x="10" y="10" width="80" height="80" fill="url(#ice1)" stroke="#000" stroke-width="4" rx="16" ry="16"/><g stroke="#fff" stroke-width="2" stroke-linecap="round" marker-end="url(#ice1)"><path d="M50 20v60"/><path d="M20 50h60"/><path d="m30 30 40 40"/><path d="m30 70 40-40"/><path d="m50 30-5-5"/><path d="m50 30 5-5"/><path d="m50 70-5 5"/><path d="m50 70 5 5"/><path d="m70 50 5-5"/><path d="m70 50 5 5"/><path d="m30 50-5-5"/><path d="m30 50-5 5"/><path d="m60 60 5 5"/><path d="m60 60-5 5"/><path d="m40 40-5-5"/><path d="m40 40 5-5"/><path d="m60 40 5-5"/><path d="m60 40 5 5"/><path d="m40 60-5-5"/><path d="m40 60-5 5"/></g></svg>`,
    sniper: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="snipe1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#333"/><stop offset="100%" stop-color="#001f3f"/></linearGradient></defs><rect x="10" y="10" width="80" height="80" fill="url(#snipe1)" stroke="#000" stroke-width="4" rx="16" ry="16"/><g fill="none" stroke="#aaa" stroke-width="3"><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="10" stroke-width="2"/><path d="M50 30v40M30 50h40"/><path stroke-width="2" d="M50 18v6m0 52v6M18 50h6m52 0h6"/></g></svg>`
};

// Tower types with fixed upgrades and special abilities
const towerTypes = [
    {   // Archer - Fast, long range, low damage, cheap
        name: "Archer",
        color: "#228b22",
        cost: 25,
        buildCost: 1,
        dmg: 8,
        rate: 400,
        range: 180,
        icon: towerIcons.archer,
        upgrades: {
            special: {
                name: "Marksman",
                cost: 5,
                purchased: false,
                description: "Bleibt auf seinem Ziel, bis es stirbt oder die Reichweite verlässt. Jeder Folgeschuss +15% Schaden, bis +60%."
            }
        },
        bulletType: "arrow"
    },
    {   // Cannon - Expensive, AOE damage
        name: "Cannon",
        cost: 90,
        buildCost: 3,
        color: "#696969",
        range: 150,
        dmg: 45,
        rate: 1200,
        icon: towerIcons.cannon,
        upgrades: {
            special: {
                name: "Cluster Munition",
                cost: 6,
                purchased: false,
                description: "Zielt auf die dichteste Ansammlung statt auf den Vordersten. Splash 80px, +12% je zusätzlichem Körper, bis +60%."
            }
        },
        bulletType: "cannonball",
        aoeRadius: 65
    },
    {   // Mage - Slow, high damage with zap upgrade
        name: "Mage",
        cost: 110,
        buildCost: 3,
        color: "#5a006c",
        range: 130,
        dmg: 145,
        rate: 1400,
        icon: towerIcons.mage,
        upgrades: {
            special: {
                name: "Curse",
                cost: 4,
                purchased: false,
                description: "Gegner im 150px-Umkreis nehmen 40% mehr Schaden aus jeder Quelle. Stapelt sich nicht."
            }
        },
        bulletType: "magic"
    },
    {   // Fire - Short range, constant damage
        name: "Fire Tower",
        cost: 70,
        buildCost: 2,
        color: "#FF4500",
        range: 60,
        dmg: 8,
        rate: 100,
        icon: towerIcons.fire,
        upgrades: {
            special: {
                name: "Cinder",
                cost: 5,
                purchased: false,
                description: "Trifft mit 20% seiner DPS als Brand nach, 3 Sekunden lang, auch außerhalb der Reichweite."
            }
        },
        bulletType: "flame",
        flameWidth: 10
    },
    {   // Ice Tower - Slows enemies
        name: "Ice Tower",
        cost: 60,
        buildCost: 2,
        color: "#007acc",
        range: 140,
        dmg: 12,
        rate: 800,
        icon: towerIcons.ice,
        upgrades: {
            special: {
                name: "Permafrost",
                cost: 3,
                duration: 5000,
                purchased: false,
                description: "Jede Sekunde in der Aura vertieft die Kälte um 12%, bis dreifach. Härtestes Tempo 30%."
            }
        },
        bulletType: "ice",
        slowFactor: 0.5
    },
    {   // Sniper Tower - Very long range, slow rate, high damage
        name: "Sniper",
        color: "#333333",
        cost: 130,
        buildCost: 4,
        range: 300,
        dmg: 105,
        rate: 1500,
        icon: towerIcons.sniper,
        upgrades: {
            special: {
                name: "Executioner",
                cost: 5,
                purchased: false,
                description: "+30% Schaden je Stufe über T1. Gegen einen T5-Boss also das 2,2-fache."
            }
        },
        bulletType: "sniper"
    }
];

// Game objects
let towers = [], enemies = [], bullets = [], lastSpawn = 0, waveInterval = 900;

// Stable identities. Nothing observable changes today; co-op needs them to
// refer to an enemy or a tower across two machines, and the sell button needs
// them to name a tower without comparing floating-point coordinates.
let nextEnemyId = 1, nextTowerId = 1;

// The tier downgrade is the most distinctive idea in this game and the player
// experienced it as a 100 ms white flash and nothing else -- no particle, no
// number, no sound. These are purely presentational and live outside the
// simulation's correctness, but they are what make the mechanic legible.
let effects = [];

function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const sp = 60 + Math.random() * 120;          // px per second
        effects.push({
            kind: 'spark', x, y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 450, maxLife: 450, color
        });
    }
}

function spawnFloatingText(x, y, text, color) {
    effects.push({ kind: 'text', x, y, text, color, life: 900, maxLife: 900 });
}

function updateEffects(dt) {
    for (const f of effects) {
        f.life -= dt;
        if (f.kind === 'spark') {
            f.x += f.vx * dt / 1000;
            f.y += f.vy * dt / 1000;
            f.vy += 240 * dt / 1000;                  // a little gravity
        } else {
            f.y -= 30 * dt / 1000;
        }
    }
    effects = effects.filter(f => f.life > 0);
}

function drawEffects() {
    for (const f of effects) {
        const t = Math.max(0, f.life / f.maxLife);
        ctx.save();
        ctx.globalAlpha = t;
        if (f.kind === 'spark') {
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2 + 3 * t, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = f.color;
            ctx.font = 'bold 18px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.65)';
            ctx.lineWidth = 3;
            ctx.strokeText(f.text, f.x, f.y);
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.restore();
    }
}
let lastUpdateTime = Date.now();

// Initialization
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
let gameScale = 1;

function resizeCanvas() {
    // Calculate scale to fit the game in the window
    const scaleX = window.innerWidth / GAME_WIDTH;
    const scaleY = window.innerHeight / GAME_HEIGHT;
    gameScale = Math.min(scaleX, scaleY);

    // Set canvas size
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // Scale the canvas to fit the window while maintaining aspect ratio
    canvas.style.width = `${GAME_WIDTH * gameScale}px`;
    canvas.style.height = `${GAME_HEIGHT * gameScale}px`;

    // Deliberately NOT regenerating the path or the decorations here.
    // GAME_WIDTH/HEIGHT are constants so the path never changes on resize,
    // but two resize listeners were registered and each call regenerated the
    // decorations, so one resize event reshuffled the whole forest six times
    // -- continuously, while dragging a window edge. initGame() builds them.
}

function preloadTowerIcons() {
    return Promise.all(towerTypes.map(tower => {
        return new Promise((resolve) => {
            // Only create new image if not already created
            if (!tower.iconImage) {
                const img = new Image();
                img.onload = () => resolve();
                img.src = 'data:image/svg+xml,' + encodeURIComponent(tower.icon);
                tower.iconImage = img;
            } else {
                resolve();  // Already loaded
            }
        });
    }));
}

function setupPath() {
    // Clear previous path
    path = [];

    // Define the path based on the selected map
    switch(gameConfig.map) {
        case 1: setupMap1(); break;
        case 2: setupMap2(); break;
        case 3: setupMap3(); break;
        case 4: setupMap4(); break;
        case 5: setupMap5(); break;
        case 6: setupMap6(); break;
    }

    // Generate map elements based on the new path
    generateMapElements();
}

function setupTowerBar() {
    towerBar.innerHTML = '';
    towerTypes.forEach((tower, index) => {
        const icon = document.createElement('div');
        icon.className = 'tower-icon';
        icon.innerHTML = tower.icon;
        icon.title = `${tower.name} (${tower.cost} gold)`;
        icon.dataset.index = index;
        icon.addEventListener('mousedown', startDragTower);
        icon.addEventListener('touchstart', startDragTower, { passive: false });
        towerBar.appendChild(icon);
    });
}

function startDragTower(e) {
    e.preventDefault();
    const index = parseInt(e.currentTarget.dataset.index);
    const towerType = towerTypes[index];

    if (gameState.gold < towerType.cost) {
        showDialog("Nicht genug Gold für diesen Turm.", "Zu teuer");
        return;
    }

    // Build points. Without a cap, building another tower beats upgrading an
    // existing one at every level of every track, forever -- the ratio is
    // 0.500 at best and 0.075 at worst -- so upgrades can never be worth the
    // gold no matter how they are priced. Points are weighted by tower rather
    // than a flat slot count, because under a flat cap the most expensive
    // tower always wins: one slot holding a Mage absorbs 1,171 gold of
    // upgrades, a slot holding an Archer absorbs 267.
    if (usedPoints() + (towerType.buildCost || 1) > BUILD_POINTS) {
        showDialog(
            `Baupunkte voll: ${usedPoints()}/${BUILD_POINTS}. ` +
            `${towerType.name} kostet ${towerType.buildCost} Punkte. ` +
            `Bau einen Turm ab oder rüste vorhandene auf.`,
            "Kein Platz mehr");
        return;
    }

    draggingTower = {
        type: {...towerType},
        typeIndex: index,
        x: 0,
        y: 0,
        width: 48,
        height: 48,
        range: towerType.range
    };

    // Calculate initial position
    const rect = canvas.getBoundingClientRect();
    if (e.type === 'mousedown') {
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    } else if (e.type === 'touchstart') {
        dragOffsetX = e.touches[0].clientX - rect.left;
        dragOffsetY = e.touches[0].clientY - rect.top;
    }

    // Convert to game coordinates
    draggingTower.x = (dragOffsetX) * (canvas.width / rect.width);
    draggingTower.y = (dragOffsetY) * (canvas.height / rect.height);

    // Add event listeners for dragging
    document.addEventListener('mousemove', dragTower);
    document.addEventListener('touchmove', dragTower, { passive: false });
    document.addEventListener('mouseup', dropTower);
    document.addEventListener('touchend', dropTower);
    document.addEventListener('touchcancel', cancelDrag);
    document.addEventListener('keydown', cancelDragOnEscape);
}

// An interrupted drag -- a phone call arriving, a swipe from the screen edge,
// Escape -- used to leave draggingTower alive, and the next tap anywhere on
// the page then bought a tower.
function clearDragListeners() {
    document.removeEventListener('mousemove', dragTower);
    document.removeEventListener('touchmove', dragTower);
    document.removeEventListener('mouseup', dropTower);
    document.removeEventListener('touchend', dropTower);
    document.removeEventListener('touchcancel', cancelDrag);
    document.removeEventListener('keydown', cancelDragOnEscape);
}

function cancelDrag() {
    draggingTower = null;
    clearDragListeners();
}

function cancelDragOnEscape(e) {
    if (e.key === 'Escape') cancelDrag();
}

function dragTower(e) {
    if (!draggingTower) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.type === 'mousemove') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    // Convert to game coordinates
    const nx = (clientX - rect.left) * (canvas.width / rect.width);
    const ny = (clientY - rect.top) * (canvas.height / rect.height);
    if (Math.hypot(nx - draggingTower.x, ny - draggingTower.y) > 4) draggingTower.moved = true;
    draggingTower.x = nx;
    draggingTower.y = ny;
}

function dropTower(e) {
    if (!draggingTower) return;
    e.preventDefault();

    clearDragListeners();

    // A plain click on a tower icon with no drag at all used to buy the tower
    // and drop it wherever the icon happened to map to -- under the bar, or
    // off the play field entirely. On touch that fired for every icon.
    if (!draggingTower.moved) {
        draggingTower = null;
        return;
    }

    // Everything below used to happen here: the gold deduction, the object
    // literal, the push. It all moved behind submitIntent(), so a click on
    // the host and a message from the guest take the identical path.
    submitIntent('placeTower', {
        typeIndex: draggingTower.typeIndex,
        x: draggingTower.x,
        y: draggingTower.y
    });

    selectedTower = null;
    upgradeMenu.style.display = 'none';
    updateUI();

    draggingTower = null;
}

function isValidTowerPosition(x, y) {
    // Bounds. Without this, releasing a drag over the letterbox margin -- the
    // drag listeners are on document, not the canvas -- bought an invisible,
    // unclickable, never-firing tower at negative coordinates. In step 9 this
    // same function becomes the network validator, so one check closes both.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (x < 0 || x > GAME_WIDTH || y < 0 || y > GAME_HEIGHT) return false;

    // Check if position is too close to path
    for (let i = 0; i < path.length - 1; i++) {
        const dist = pointLineDist(x, y, path[i].x, path[i].y, path[i+1].x, path[i+1].y);
        if (dist < 42) {
            return false;
        }
    }

    // Check if position is too close to start/end
    if (Math.hypot(x - path[0].x, y - path[0].y) < 60) return false;
    if (Math.hypot(x - path[path.length-1].x, y - path[path.length-1].y) < 60) return false;

    // Check if position is too close to other towers
    for (const tower of towers) {
        if (Math.hypot(x - tower.x, y - tower.y) < 48) {
            return false;
        }
    }

    // Check if position is too close to tower bar area (bottom center)
    const towerBarArea = {
        x: canvas.width / 2,
        y: canvas.height - 60,
        width: 300,
        height: 80
    };

    if (x > towerBarArea.x - towerBarArea.width/2 &&
        x < towerBarArea.x + towerBarArea.width/2 &&
        y > towerBarArea.y - towerBarArea.height/2 &&
        y < towerBarArea.y + towerBarArea.height/2) {
        return false;
    }

    return true;
}

function pointLineDist(px, py, ax, ay, bx, by) {
    let dx = bx - ax, dy = by - ay;
    let len = dx * dx + dy * dy;
    let t = len === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len;
    t = Math.max(0, Math.min(1, t));
    let lx = ax + t * dx, ly = ay + t * dy;
    return Math.hypot(px - lx, py - ly);
}

function generateMapElements() {
    mapElements = [];
    let count = Math.floor(canvas.width * canvas.height / 42000);

    for (let i = 0; i < count; i++) placeElement('tree1', 34, 0.54);
    for (let i = 0; i < count/2; i++) placeElement('tree2', 27, 0.6);
    for (let i = 0; i < count/2; i++) placeElement('tree3', 30, 0.6);
    for (let i = 0; i < count/3; i++) placeElement('rock', 25, 0.8);

    function placeElement(type, rad, alpha) {
        let ok = false, tries = 0, x, y;
        while (!ok && tries < 120) {
            x = rad + Math.random() * (canvas.width - 2 * rad);
            y = rad + Math.random() * (canvas.height - 2 * rad);
            ok = true;

            // Check path distance
            for (let i = 0; i < path.length - 1; i++) {
                let d = pointLineDist(x, y, path[i].x, path[i].y, path[i+1].x, path[i+1].y);
                if (d < 42) { ok = false; break; }
            }

            // Check start/end distance
            if (Math.hypot(x - path[0].x, y - path[0].y) < 60) ok = false;
            if (Math.hypot(x - path[path.length-1].x, y - path[path.length-1].y) < 60) ok = false;

            // Check other elements
            for (let el of mapElements) {
                if (Math.hypot(x - el.x, y - el.y) < el.r + rad + 4) {
                    ok = false;
                    break;
                }
            }

            tries++;
        }

        if (ok) {
            mapElements.push({
                type: type,
                x: x, y: y, r: rad, a: alpha,
                shape: type.includes('rock') ? Math.floor(Math.random() * 3) : 0
            });
        }
    }
}

// Start the wave
function startWave() {
    gameState.waveActive = true;
    gameState.enemiesInWave = gameState.nextWaveEnemies;
    gameState.enemiesLeft = gameState.enemiesInWave;
    gameState.enemiesKilled = 0;
    gameState.enemiesLeaked = 0;
    gameState.enemiesTotal = gameState.enemiesInWave;

    // Calculate enemies for next wave. No DOM here either -- updateUI()
    // derives the wave counter and the Start button from state each frame.
    gameState.nextWaveEnemies = 10 + gameState.wave * 2;   // sets the NEXT wave: 10,12,14...28 = 190 total

    lastSpawn = simTime - waveInterval;

    // Send multiplayer message if in multiplayer mode
    if (gameConfig.isMultiplayer && gameConfig.playerRole === 'host') {
        multiplayerManager.sendMessage('waveStarted', {
            wave: gameState.wave,
            enemies: gameState.enemiesInWave
        });
    }
}

// Spawn an enemy based on the current wave
// Tier mix per wave, in percent; each row sums to 100. This replaces a step
// function that flipped the entire wave up a tier at once, which is what
// produced the x4.24 and x2.98 difficulty cliffs. The mix now shifts
// gradually, so wave-to-wave HP growth stays between x1.56 and x1.63.
const WAVE_TIERS = [
//   T1   T2   T3   T4   T5
    [100,   0,   0,   0,   0],  // wave 1
    [ 85,  15,   0,   0,   0],  // wave 2
    [ 65,  35,   0,   0,   0],  // wave 3
    [ 45,  50,   5,   0,   0],  // wave 4
    [ 30,  50,  20,   0,   0],  // wave 5
    [ 15,  50,  30,   5,   0],  // wave 6
    [ 15,  40,  30,  10,   5],  // wave 7  <- first T5 Boss
    [  5,  25,  40,  20,  10],  // wave 8
    [  0,  15,  30,  30,  25],  // wave 9
    [  0,   0,  10,  40,  50],  // wave 10
];

// ======================
// SOUND
// ======================
// Synthesised with WebAudio: no asset files, nothing to load, nothing to go
// 404 on Pages. The game had no audio at all, which mattered most for the
// tier downgrade -- its best idea was communicated by a colour change the
// player was usually not looking at.
//
// Browsers refuse to start an AudioContext until the user has interacted, so
// it is created lazily on the first click and the first call before that is
// simply dropped.
let audioCtx = null;
let masterGain = null;
let soundOn = true;

function initAudio() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.25;
        masterGain.connect(audioCtx.destination);
    } catch (e) {
        audioCtx = null;
    }
    return audioCtx;
}

// One voice: an oscillator sweeping from f0 to f1 over ms, shaped by a short
// attack and an exponential release so nothing clicks.
function blip(f0, f1, ms, type, gain) {
    if (!soundOn || !audioCtx || audioCtx.state === 'suspended') return;
    const t = audioCtx.currentTime;
    const dur = ms / 1000;

    const osc = audioCtx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain ?? 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.02);
}

// Filtered noise, for impacts that a tone cannot carry.
function noiseBurst(ms, cutoff, gain) {
    if (!soundOn || !audioCtx || audioCtx.state === 'suspended') return;
    const t = audioCtx.currentTime;
    const n = Math.floor(audioCtx.sampleRate * ms / 1000);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);

    const src = audioCtx.createBufferSource();
    src.buffer = buf;

    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff || 1200;

    const g = audioCtx.createGain();
    g.gain.value = gain ?? 0.25;

    src.connect(filt); filt.connect(g); g.connect(masterGain);
    src.start(t);
}

// Shots are the most frequent sound by far, so they are rate-limited: at 22
// towers firing several times a second the mix turns to mush and, worse, each
// voice costs a node graph.
let lastShotSound = 0;
const SHOT_SOUND_GAP = 60;

const SFX = {
    shoot(kind) {
        const now = performance.now();
        if (now - lastShotSound < SHOT_SOUND_GAP) return;
        lastShotSound = now;
        switch (kind) {
            case 'arrow':      blip(900, 420, 60, 'triangle', 0.16); break;
            case 'sniper':     blip(1600, 300, 110, 'sawtooth', 0.18); break;
            case 'cannonball': blip(180, 70, 130, 'square', 0.22); break;
            case 'magic':      blip(660, 1180, 90, 'sine', 0.16); break;
            case 'ice':        blip(1400, 1900, 70, 'sine', 0.12); break;
            default:           blip(800, 400, 50, 'triangle', 0.14);
        }
    },
    // The tier downgrade: pitch RISES with each tier broken, so a boss walking
    // down the ladder is an audible four-note run and you hear how deep the
    // hit went without watching the numbers.
    downgrade(tier) {
        blip(220 * Math.pow(1.26, 5 - tier), 0, 120, 'square', 0.22);
        noiseBurst(90, 2200, 0.16);
    },
    kill()      { blip(520, 180, 150, 'square', 0.2); noiseBurst(120, 900, 0.18); },
    leak()      { blip(160, 90, 320, 'sawtooth', 0.3); },
    build()     { blip(300, 620, 110, 'square', 0.22); },
    sell()      { blip(620, 300, 110, 'square', 0.2); },
    upgrade()   { blip(500, 900, 90, 'triangle', 0.22); blip(750, 1200, 120, 'triangle', 0.16); },
    doctrine()  { [0, 90, 180].forEach((d, i) => setTimeout(() => blip(520 * (1 + i * 0.26), 0, 200, 'sine', 0.22), d)); },
    waveStart() { blip(300, 500, 180, 'sawtooth', 0.2); },
    refused()   { blip(200, 150, 140, 'square', 0.18); },
    won()       { [0, 130, 260, 430].forEach((d, i) => setTimeout(() => blip([523, 659, 784, 1047][i], 0, 320, 'triangle', 0.24), d)); },
    lost()      { [0, 180, 380].forEach((d, i) => setTimeout(() => blip([330, 262, 196][i], 0, 420, 'sawtooth', 0.24), d)); },
};

function setSound(on) {
    soundOn = on;
    try { localStorage.setItem('lot-sound', on ? '1' : '0'); } catch (e) {}
    const btn = document.getElementById('toggleSound');
    if (btn) {
        btn.textContent = on ? '🔊' : '🔇';
        btn.setAttribute('aria-pressed', String(on));
    }
}

try { soundOn = localStorage.getItem('lot-sound') !== '0'; } catch (e) {}

document.addEventListener('DOMContentLoaded', () => {
    setSound(soundOn);
    document.getElementById('toggleSound')?.addEventListener('click', () => setSound(!soundOn));
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') setSound(!soundOn);
});

// The context can only be created from a real gesture.
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, () => {
        const c = initAudio();
        if (c && c.state === 'suspended') c.resume();
    }, { once: false, passive: true }));

// ======================
// PURSES
// ======================
// Each player has their own gold. Lives, crystals and the board stay shared:
// lives because you defend one base together, crystals because a doctrine is
// bought per tower TYPE and therefore benefits both of you.
//
// The authority owns the purses. gameState.gold is only ever the LOCAL
// player's view of their own, so every existing read -- the HUD, the "can I
// afford this" checks, the upgrade panel -- keeps working unchanged.
let purses = { host: 0, guest: 0, single: 0 };

function myRole() {
    return gameConfig.isMultiplayer ? (gameConfig.playerRole || 'guest') : 'single';
}

function setPurse(role, value) {
    purses[role] = value;
    if (role === myRole()) gameState.gold = value;
}

function addPurse(role, amount) {
    setPurse(role, (purses[role] || 0) + amount);
}

// Gold from a kill goes to whoever landed the last hit on that enemy. Damage
// with no identifiable owner -- a Curse amplification with no tower behind
// it, anything added later -- is split, so no income can quietly vanish.
function creditGold(enemy, amount) {
    if (!gameConfig.isMultiplayer) { addPurse('single', amount); return; }
    const owner = enemy && enemy.lastDamageBy;
    if (owner === 'host' || owner === 'guest') {
        addPurse(owner, amount);
    } else {
        addPurse('host', amount / 2);
        addPurse('guest', amount / 2);
    }
}

// ======================
// SNAPSHOTS
// ======================
// The host sends the world at 15 Hz -- every 4th fixed step, so the schedule
// is the simulation clock itself and there is no second timer to drift.
const SNAPSHOT_EVERY = 4;
const INTERP_DELAY_MS = 2 * SNAPSHOT_EVERY * (1000 / 60);   // one snapshot of slack
const MAX_EXTRAPOLATE_MS = 250;
const STALL_MS = 3000;

let simTick = 0;
// [towerId, enemyId] per shot since the last snapshot. Bullets are never
// simulated on the guest -- three of the six towers deal damage with no
// bullet object at all (Fire is hitscan, and the burn and splash have no
// projectile), so predicting them locally would mean reproducing the host's
// targeting exactly, ties included. About 12 bytes a shot is cheaper.
let pendingShots = [];
let pendingGuestShots = [];
let snapA = null, snapB = null;      // the two snapshots we interpolate between
let playoutOffset = null;            // running minimum of (recvAt - k*STEP_MS)
let lastSnapshotAt = 0;
let guestStalled = false;

function broadcastGameOver(won, text) {
    if (!gameConfig.isMultiplayer || !isAuthority()) return;
    multiplayerManager.sendMessage('gameOver', { won, text });
}

function sendSnapshot() {
    if (!gameConfig.isMultiplayer || !isAuthority()) return;
    multiplayerManager.sendMessage('snapshot', {
        k: simTick,
        lives: gameState.lives,
        purses: purses,
        crystals: gameState.crystals,
        wave: gameState.wave,
        waveActive: gameState.waveActive,
        enemiesLeft: gameState.enemiesLeft,
        enemiesInWave: gameState.enemiesInWave,
        enemiesKilled: gameState.enemiesKilled,
        enemiesLeaked: gameState.enemiesLeaked,
        shots: pendingShots,
        // Flat tuples. maxHp, colour, type and speed are all derivable on the
        // guest from tier plus difficulty, so none of them go on the wire.
        e: enemies.map(e => [
            e.id, Math.round(e.x), Math.round(e.y), Math.round(e.hp),
            e.currentTier, e.pathIndex, Math.round(e.freezeTimer || 0),
            Number((e.slowAmount || 1).toFixed(2))
        ]),
    });
    pendingShots = [];
}

// Guest-side visual bullets. They carry no damage and no authority; they
// exist so the player can see what the towers are doing.
function updateGuestBullets(dt) {
    for (const b of bullets) {
        if (b.target?.alive) { b.tx = b.target.x; b.ty = b.target.y; }
        const dx = b.tx - b.x, dy = b.ty - b.y, dist = Math.hypot(dx, dy);
        const step = b.speed * dt / STEP_MS;
        if (dist < step || !Number.isFinite(dist)) { b.hit = true; }
        else { b.x += step * dx / dist; b.y += step * dy / dist; }
    }
    bullets = bullets.filter(b => !b.hit);
}

function spawnGuestShots(shots) {
    for (const [towerId, enemyId] of shots || []) {
        const t = towers.find(x => x.id === towerId);
        if (!t) continue;

        // Drives the Fire Tower's beam and any other elapsed-time visual.
        t.lastShot = simTime;
        t.focus = enemies.find(x => x.id === enemyId) || t.focus;

        SFX.shoot(t.type.bulletType);
        if (t.type.bulletType === 'flame') continue;   // hitscan, no projectile
        const target = enemies.find(x => x.id === enemyId);
        if (!target) continue;

        bullets.push({
            x: t.x, y: t.y, tx: target.x, ty: target.y,
            dmg: 0, target: target, color: t.type.color,
            speed: t.type.bulletType === 'arrow' ? 12 :
                   t.type.bulletType === 'sniper' ? 20 : 6,
            aoeRadius: 0,
            type: t.type.bulletType, tower: t,
        });
    }
}

function applySnapshot(data) {
    const now = performance.now();
    lastSnapshotAt = now;
    guestStalled = false;

    // Interpolate on SIM TIME, not arrival time: on a reliable ordered channel
    // a retransmit head-of-line-blocks, so the pattern after a loss is
    // gap-then-burst and arrival-time lerp replays 130-200 ms of motion in a
    // few milliseconds.
    //
    // But the offset has to TRACK the sender rather than latch to its minimum.
    // k * STEP_MS is only an exact wall clock if the host renders a perfect 60
    // fps; the moment it drops a frame or is backgrounded, its sim clock falls
    // behind real time, (recvAt - k*STEP) grows monotonically, and a running
    // minimum pins the render clock to the very first sample. Measured: the
    // render tick ran 76 ticks -- 1267 ms -- ahead of the newest snapshot, so
    // every frame was capped extrapolation and enemies moved 10, 1, 10, 6, 1
    // pixels per snapshot. Snap down immediately (a faster packet means we can
    // afford less latency), drift up slowly (follow the sender's real rate).
    const offset = now - data.k * STEP_MS;
    if (playoutOffset === null || offset < playoutOffset) {
        playoutOffset = offset;
    } else {
        playoutOffset += (offset - playoutOffset) * 0.08;
    }

    snapA = snapB;
    snapB = data;
    // Append rather than replace: snapshots arrive on the network thread and
    // are consumed on the render thread, so any hitch on the guest would
    // otherwise silently drop a whole snapshot's worth of shots. Capped so a
    // long stall cannot spawn a burst of hundreds at once.
    if (data.shots && data.shots.length) {
        pendingGuestShots.push(...data.shots);
        if (pendingGuestShots.length > 40) {
            pendingGuestShots = pendingGuestShots.slice(-40);
        }
    }

    // Scalars snap; they are not positions and lerping them would lie.
    gameState.lives = data.lives;
    if (data.purses) {
        purses = data.purses;
        gameState.gold = purses[myRole()] ?? gameState.gold;
    }
    gameState.crystals = data.crystals;
    gameState.wave = data.wave;
    gameState.waveActive = data.waveActive;
    gameState.enemiesLeft = data.enemiesLeft;
    gameState.enemiesInWave = data.enemiesInWave;
    gameState.enemiesKilled = data.enemiesKilled;
    gameState.enemiesLeaked = data.enemiesLeaked;
}

// Rebuild the guest's enemy list for this frame. Runs in place of
// stepSimulation(), which the guest never calls.
function updateGuest(dt) {
    // The guest never runs stepSimulation, so simTime never advanced -- and
    // every visual keyed to elapsed time was therefore stuck. The Fire Tower's
    // beam is gated on `simTime - t.lastShot < 100`, which with both at 0 was
    // permanently true, which is why the guest saw that one beam and nothing
    // else.
    simTime += dt;
    updateEffects(dt);
    updateGuestBullets(dt);

    if (!snapB) return;

    const now = performance.now();
    if (now - lastSnapshotAt > STALL_MS) guestStalled = true;

    // Where in the host's sim clock we want to be right now.
    const renderTick = (now - playoutOffset - INTERP_DELAY_MS) / STEP_MS;

    const A = snapA || snapB, B = snapB;
    const span = B.k - A.k;

    // Clamp the render tick into [A, B + cap]. Past the cap we hold position
    // rather than inventing one -- an enemy extrapolated far enough visibly
    // walks off the road, because the guest paints the road itself.
    const maxTick = B.k + MAX_EXTRAPOLATE_MS / STEP_MS;
    const tick = Math.min(Math.max(renderTick, A.k), maxTick);
    let alpha = span > 0 ? (tick - A.k) / span : 1;

    const prev = new Map((A.e || []).map(t => [t[0], t]));
    enemies.length = 0;
    for (const t of B.e || []) {
        const [id, x, y, hp, tier, pathIndex, freezeMs, slow] = t;
        const type = enemyTiers[tier - 1] || enemyTiers[0];
        const p = prev.get(id);

        let px = x, py = y;
        if (p && alpha !== 1) {
            // Lerp along the segment we actually have. hp and tier SNAP: a
            // lerped health bar lies about when the hit landed.
            px = p[1] + (x - p[1]) * alpha;
            py = p[2] + (y - p[2]) * alpha;
        }

        enemies.push({
            id, x: px, y: py, pathIndex,
            hp, maxHp: type.hp * waveHpScale(),
            speed: type.speed, alive: true, type,
            goldValue: type.goldValue, currentTier: tier, originalTier: tier,
            slowTimer: 0, slowAmount: slow, freezeTimer: freezeMs,
            lastBlink: 0, blinkColor: null
        });
    }

    if (pendingGuestShots.length) {
        spawnGuestShots(pendingGuestShots);
        pendingGuestShots = [];
    }
}

// ======================
// INTENTS
// ======================
// Exactly one machine decides what is true. Anything that changes enemies,
// bullets, towers, lives, gold, crystals or the wave runs ONLY on the host;
// everything that reads those to paint pixels runs on both.
//
// The discipline that makes this testable: the host has NO privileged
// mutation path. A click on the host and a message from the guest both land
// in the same applyX() function, so single player exercises the entire
// pipeline on every tower placement, in one tab, before a second machine is
// involved.
function isAuthority() {
    return !gameConfig.isMultiplayer || gameConfig.playerRole === 'host'
                                     || gameConfig.playerRole === 'single';
}

function submitIntent(type, data) {
    if (isAuthority()) {
        const res = applyIntent(type, data, gameConfig.playerRole || 'single');
        if (!res.ok) { SFX.refused(); showDialog(res.reason, 'Geht nicht'); }
        return res;
    }
    multiplayerManager.sendMessage('intent', { type, data });
    return { ok: true, pending: true };
}

// Host-side. `who` is 'host' | 'guest' | 'single'.
function applyIntent(type, data, who) {
    switch (type) {
        case 'placeTower':   return applyPlaceTower(data, who);
        case 'upgradeTower': return applyUpgradeTower(data, who);
        case 'sellTower':    return applySellTower(data, who);
        case 'startWave':    return applyStartWave(data, who);
        default:             return { ok: false, reason: 'Unbekannte Aktion.' };
    }
}

function applyPlaceTower(data, who) {
    const typeIndex = data.typeIndex | 0;
    const towerType = towerTypes[typeIndex];
    if (!towerType) return { ok: false, reason: 'Unbekannter Turmtyp.' };

    const x = Number(data.x), y = Number(data.y);
    // Re-run on the host's own towers array. The old towerPlaced message
    // pushed a remote tower with no validation and no cost at all -- a free
    // tower anywhere, including directly on the path.
    if (!isValidTowerPosition(x, y)) return { ok: false, reason: 'Da passt kein Turm hin.' };

    if (usedPoints() + (towerType.buildCost || 1) > BUILD_POINTS) {
        return { ok: false, reason: `Baupunkte voll: ${usedPoints()}/${BUILD_POINTS}.` };
    }
    // Checked at APPLY time, not at request time: two simultaneous requests
    // can each individually pass an earlier check.
    if ((purses[who] || 0) < towerType.cost) return { ok: false, reason: 'Nicht genug Gold.' };

    addPurse(who, -towerType.cost);
    const tower = {
        id: nextTowerId++,
        typeIndex: typeIndex,
        x: x,
        y: y,
        type: { ...towerType },
        lastShot: 0,
        level: 1,
        upgrades: {
            dmgLv: 0, rateLv: 0, rangeLv: 0, slowLv: 0,
            special: towerType.upgrades.special
                ? { ...towerType.upgrades.special, purchased: false } : null
        },
        goldInvested: towerType.cost,
        flameWidth: towerType.bulletType === 'flame' ? 10 : 0,
        lastFreeze: 0,
        placedBy: who
    };
    towers.push(tower);
    SFX.build();
    broadcastTowers();
    updateUI();
    return { ok: true, id: tower.id };
}

function applyUpgradeTower(data, who) {
    const tower = towers.find(t => t.id === data.id);
    if (!tower) return { ok: false, reason: 'Turm gibt es nicht mehr.' };

    if (data.track === 'special') {
        const sp = tower.type.upgrades.special;
        if (!sp) return { ok: false, reason: 'Dieser Turm hat keine Doktrin.' };
        if (doctrines[tower.type.name]) return { ok: false, reason: 'Doktrin ist schon aktiv.' };
        if (gameState.crystals < sp.cost) return { ok: false, reason: 'Nicht genug Kristalle.' };
        gameState.crystals -= sp.cost;
        doctrines[tower.type.name] = true;
        SFX.doctrine();
        broadcastTowers();
        updateUI();
        return { ok: true };
    }

    if (!towerTracks(tower).includes(data.track)) return { ok: false, reason: 'Diesen Ausbau gibt es hier nicht.' };
    const lvKey = data.track + 'Lv';
    if ((tower.upgrades[lvKey] || 0) >= UPG_MAX) return { ok: false, reason: 'Schon auf Maximalstufe.' };

    const price = upgradePrice(tower, data.track);
    if ((purses[who] || 0) < price) return { ok: false, reason: 'Nicht genug Gold.' };

    addPurse(who, -price);
    tower.upgrades[lvKey] = (tower.upgrades[lvKey] || 0) + 1;
    tower.level = (tower.level || 1) + 1;
    tower.goldInvested = (tower.goldInvested || 0) + price;
    SFX.upgrade();
    broadcastTowers();
    updateUI();
    return { ok: true };
}

function applySellTower(data, who) {
    const i = towers.findIndex(t => t.id === data.id);
    if (i === -1) return { ok: false, reason: 'Turm gibt es nicht mehr.' };
    SFX.sell();
    addPurse(who, sellValue(towers[i]));
    towers.splice(i, 1);
    broadcastTowers();
    updateUI();
    return { ok: true };
}

function applyStartWave(data, who) {
    if (gameState.phase !== 'playing') return { ok: false, reason: 'Das Spiel läuft gerade nicht.' };
    if (gameState.waveActive) return { ok: false, reason: 'Die Welle läuft schon.' };
    SFX.waveStart();
    startWave();
    return { ok: true };
}

// Towers change rarely, so they are sent whole rather than diffed. Identity
// is by id; coordinates are floats and the old code matched towers by
// comparing them for equality.
function broadcastTowers() {
    if (!gameConfig.isMultiplayer || !isAuthority()) return;
    multiplayerManager.sendMessage('towerState', {
        towers: towers.map(t => ({
            id: t.id, typeIndex: t.typeIndex, x: t.x, y: t.y,
            level: t.level, placedBy: t.placedBy,
            dmgLv: t.upgrades.dmgLv | 0, rateLv: t.upgrades.rateLv | 0,
            rangeLv: t.upgrades.rangeLv | 0, slowLv: t.upgrades.slowLv | 0,
        })),
        doctrines: doctrines,
    });
}

// Guest-side: rebuild the tower list from the host's truth. The type object
// is rebuilt locally because it carries a live HTMLImageElement.
function applyTowerState(data) {
    const byId = new Map(towers.map(t => [t.id, t]));
    towers.length = 0;
    for (const w of data.towers) {
        const towerType = towerTypes[w.typeIndex];
        if (!towerType) continue;
        const existing = byId.get(w.id);
        towers.push({
            id: w.id,
            typeIndex: w.typeIndex,
            x: w.x, y: w.y,
            type: { ...towerType },
            lastShot: existing ? existing.lastShot : 0,
            focus: existing ? existing.focus : null,
            level: w.level,
            upgrades: {
                dmgLv: w.dmgLv, rateLv: w.rateLv, rangeLv: w.rangeLv, slowLv: w.slowLv,
                special: towerType.upgrades.special
                    ? { ...towerType.upgrades.special, purchased: false } : null
            },
            goldInvested: 0,
            flameWidth: towerType.bulletType === 'flame' ? 10 : 0,
            lastFreeze: 0,
            placedBy: w.placedBy
        });
    }
    if (data.doctrines) doctrines = data.doctrines;
}

// ======================
// DOCTRINES
// ======================
// Six passives, bought ONCE PER TOWER TYPE rather than per tower. Per-tower
// purchasing made price select a tower COUNT instead of an axis -- four
// Archer doctrines at 3 crystals each beat any three different axes -- which
// recreates the exact problem this replaces: six abilities that all said
// "hit more targets".
//
// Each one reads a different input about the world:
//   Archer  Marksman   the tower's own firing history
//   Cannon  Cluster    the enemies' formation relative to each other
//   Mage    Curse      where the tower stands on the board
//   Fire    Cinder     time elapsed since contact
//   Ice     Permafrost enemy speed
//   Sniper  Executioner what the enemy IS
let doctrines = {
    'Archer': false, 'Cannon': false, 'Mage': false,
    'Fire Tower': false, 'Ice Tower': false, 'Sniper': false,
};

const CURSE_RADIUS = 150;     // fixed on purpose: see below
const CURSE_BONUS = 0.40;
const MARKSMAN_STEP = 0.15, MARKSMAN_CAP = 4;
const CLUSTER_RADIUS = 80, CLUSTER_STEP = 0.12, CLUSTER_CAP = 5;
const EXECUTIONER_STEP = 0.30;
const CINDER_SHARE = 0.20, CINDER_MS = 3000, CINDER_TICK = 250;
const PERMAFROST_STEP = 0.88, PERMAFROST_STACKS = 3, SLOW_FLOOR = 0.30;

// Curse does NOT stack: four Mages give +40%, never +160%. The radius is
// fixed rather than read from the tower's range, because otherwise gold buys
// 51% more coverage and, under per-type unlocking, coverage would scale with
// Mage count. Build points are what bound it instead -- blanketing map 1
// needs about nine Mages, which is 27 of your 36 points.
function curseMultiplier(e) {
    if (!doctrines['Mage']) return 1;
    for (const t of towers) {
        if (t.type.name !== 'Mage') continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) <= CURSE_RADIUS) return 1 + CURSE_BONUS;
    }
    return 1;
}

// The one place damage is applied, so Curse reaches every source without
// being wired into each of them separately.
function damageEnemy(e, amount, blinkColor, owner) {
    e.hp -= amount * curseMultiplier(e);
    e.lastBlink = Date.now();
    e.blinkColor = blinkColor || '#ff4444';
    // Last hit decides who gets paid for this enemy.
    if (owner) e.lastDamageBy = owner;
}

// Executioner reads what the enemy IS, re-evaluated as it walks down the
// ladder. Applied per tier inside the kill loop too, so overkill crossing
// from T5 into T4 is not spent at T5's rate.
function executionerMultiplier(t, e) {
    if (!doctrines['Sniper'] || t.type.name !== 'Sniper') return 1;
    return 1 + EXECUTIONER_STEP * ((e.currentTier || 1) - 1);
}

function leaderOf(list) {
    let best = null, bestIdx = -1;
    for (const e of list) {
        if (e.pathIndex > bestIdx) { bestIdx = e.pathIndex; best = e; }
    }
    return best;
}

// Cluster Munition reads enemy-to-enemy geometry -- the only targeting rule
// in the game that does. It will ignore a leaker to hit the pack, which is a
// real cost, so the chosen target gets a reticle in draw().
function densestOf(list) {
    let best = null, bestCount = -1, bestIdx = -1;
    for (const e of list) {
        let n = 0;
        for (const o of enemies) {
            if (o.alive && o !== e && Math.hypot(o.x - e.x, o.y - e.y) <= CLUSTER_RADIUS) n++;
        }
        if (n > bestCount || (n === bestCount && e.pathIndex > bestIdx)) {
            bestCount = n; bestIdx = e.pathIndex; best = e;
        }
    }
    return best;
}

// Cinder burns for 20% of this tower's DPS. The rate is floored: the old
// unclamped accumulator could drive it to zero, and an Infinity burn is an
// instant kill on everything in the lane rather than something the frame
// gate limits.
function cinderDps(t) {
    return towerDamage(t) / (Math.max(50, towerRate(t)) / 1000) * CINDER_SHARE;
}

// ======================
// TOWER STATS
// ======================
// Every read of a tower's damage, rate, range or slow goes through these.
// The old code inlined `type.dmg + (upgrades.dmg || 0)` at eight separate
// sites, and one of them -- the Fire Tower's only damage application -- is
// easy to miss, which would have made its whole damage track a no-op.
const UPG_MAX = 4;                       // levels per track
const UPG_DMG_STEP   = 1.25;             // multiplicative
const UPG_RATE_STEP  = 0.85;             // multiplicative: can never reach 0
const UPG_RANGE_STEP = 15;               // flat
const UPG_SLOW_STEP  = 0.85;             // multiplicative, downward

function towerDamage(t) { return t.type.dmg   * Math.pow(UPG_DMG_STEP,  t.upgrades.dmgLv   || 0); }
function towerRate(t)   { return t.type.rate  * Math.pow(UPG_RATE_STEP, t.upgrades.rateLv  || 0); }
function towerRange(t)  { return t.type.range + UPG_RANGE_STEP * (t.upgrades.rangeLv || 0); }
function towerSlowFactor(t) {
    if (t.type.slowFactor === undefined) return 1;
    return t.type.slowFactor * Math.pow(UPG_SLOW_STEP, t.upgrades.slowLv || 0);
}

// Price scales with the tower's own cost and the level being bought, so a
// Mage upgrade costs Mage money. The flat `30 + wave * 5` it replaces was a
// scam early and free late.
// 70% of everything sunk into the tower, build price included.
function sellValue(t) {
    return Math.floor((t.goldInvested || t.type.cost) * 0.7);
}

function upgradePrice(t, track) {
    const k = (track === 'range') ? 0.15 : 0.50;
    const level = (t.upgrades[track + 'Lv'] || 0) + 1;
    return Math.round(t.type.cost * k * Math.pow(1.6, level - 1));
}

// Build points. A flat slot cap would make the most expensive tower always
// win, because one slot holding a Mage absorbs 1,171 gold of upgrades while a
// slot holding an Archer absorbs 267. Weighted points make a slot cost roughly
// what the tower costs, so damage per gold stays the operative metric.
const BUILD_POINTS = 36;
function usedPoints() {
    return towers.reduce((n, t) => n + (t.type.buildCost || 1), 0);
}

// The one place the enemy HP scale is defined. spawnEnemy() and the tier
// downgrade must agree exactly, or a downgraded enemy ends up tougher than a
// freshly spawned one of the same tier.
function waveHpScale() {
    return gameConfig.difficulties[gameConfig.difficulty].enemyHpMultiplier
         * (1 + (gameState.wave - 1) * 0.1);
}

function rollTier(wave) {
    const row = WAVE_TIERS[Math.min(wave, WAVE_TIERS.length) - 1];
    let r = Math.random() * 100;
    for (let i = 0; i < 5; i++) {
        r -= row[i];
        if (r < 0) return i;
    }
    return 4;
}

function spawnEnemy() {
    const enemyType = enemyTiers[rollTier(gameState.wave)];

    // The tier mix and the per-wave scale BOTH carry the ramp, and both are
    // needed. Mix alone gives x1.44-x1.53 per wave while income grows x1.52,
    // so the run would get easier as it went; together they give x1.53-x1.63
    // and 0.074 gold per HP over the run, against a 0.071 target.
    const hpMultiplier = waveHpScale();

    enemies.push({
        id: nextEnemyId++,
        x: path[0].x,
        y: path[0].y,
        pathIndex: 0,
        hp: enemyType.hp * hpMultiplier,
        maxHp: enemyType.hp * hpMultiplier,
        speed: enemyType.speed,
        alive: true,
        type: enemyType,
        goldValue: enemyType.goldValue,
        lastBlink: 0,
        blinkColor: "#ffffff",
        currentTier: enemyType.tier,
        originalTier: enemyType.tier,
        slowTimer: 0,
        slowAmount: 1, // 1 = normal speed
        freezeTimer: 0
    });
}

// Freeze enemies in range (for Ice Tower special ability)
// (Removed: freezeEnemies(). Ice's auto-firing 30 s freeze is replaced by
// Permafrost, a passive the player can actually see working.)

// One fixed simulation step. Contains no DOM access: the HUD is written once
// per rendered frame by syncUIFromState(), not once per step, so five catch-up
// steps do not mean five DOM writes.
function stepSimulation(dt) {
    if (gameState.phase !== 'playing') return;
    // The guest does not simulate. It renders what the host tells it.
    if (!isAuthority()) return;

    simTime += dt;
    const now = simTime;
    const deltaTime = dt;

    // Spawn enemies
    if (gameState.waveActive && gameState.enemiesInWave > 0 && now - lastSpawn > waveInterval) {
        spawnEnemy();
        lastSpawn = now;
        gameState.enemiesInWave--;
    }

    // Ice is an AURA now, recomputed every step from the ice towers actually
    // covering each enemy. The old code applied the slow from a bullet, to
    // exactly one enemy per shot, for 2000 ms at an 800 ms fire rate -- so at
    // most 2.5 enemies were slowed at a time out of the ~13.6 standing in an
    // Ice tower's stretch at wave 10. That is not control, it is a rounding
    // error. Overlapping towers take the strongest slow, they do not stack.
    const iceTowers = towers.filter(t => t.type.slowFactor !== undefined);

    // Move enemies
    for (const e of enemies) {
        // CINDER burns on after the enemy has left the tower's 60 px range.
        // Ticked here, at the top, because the loop `continue`s for frozen
        // enemies further down and a burn that stops when an enemy is frozen
        // would miss exactly the case it exists for.
        if (e.burnTimer > 0) {
            e.burnTimer -= dt;
            e.burnAcc = (e.burnAcc || 0) + dt;
            while (e.burnAcc >= CINDER_TICK) {
                e.burnAcc -= CINDER_TICK;
                damageEnemy(e, (e.burnDps || 0) * CINDER_TICK / 1000, '#ff6d00', e.burnTower?.placedBy);
            }
            if (e.burnTimer <= 0) { e.burnDps = 0; e.burnAcc = 0; }
        }

        let slow = 1;
        let inAnyIce = false;
        for (const t of iceTowers) {
            if (Math.hypot(e.x - t.x, e.y - t.y) <= towerRange(t)) {
                inAnyIce = true;
                slow = Math.min(slow, towerSlowFactor(t));
            }
        }

        // PERMAFROST reads enemy speed: every second spent inside an aura
        // deepens the chill. The floor is a pacing budget, not a safety
        // limit -- there is no soft-lock, a slowed enemy still walks and
        // still reaches the exit -- but a T5 at 0.30 occupies the board for
        // over four minutes and wave 10 has 28 of them.
        if (doctrines['Ice Tower'] && inAnyIce) {
            e.chillAcc = (e.chillAcc || 0) + dt;
            while (e.chillAcc >= 1000 && (e.chillStacks || 0) < PERMAFROST_STACKS) {
                e.chillAcc -= 1000;
                e.chillStacks = (e.chillStacks || 0) + 1;
            }
        } else {
            e.chillAcc = 0;
            e.chillStacks = 0;
        }
        if (e.chillStacks) slow *= Math.pow(PERMAFROST_STEP, e.chillStacks);

        e.slowAmount = Math.max(SLOW_FLOOR, slow);

        // Handle freeze effect
        if (e.freezeTimer > 0) {
            e.freezeTimer -= deltaTime;
            continue; // Skip movement if frozen
        }

        let tgt = path[e.pathIndex + 1];
        if (!tgt) continue;

        let dx = tgt.x - e.x, dy = tgt.y - e.y, dist = Math.hypot(dx, dy);
        let moveSpeed = e.speed * e.slowAmount;

        if (dist < moveSpeed) {
            e.x = tgt.x;
            e.y = tgt.y;
            e.pathIndex++;

            if (e.pathIndex >= path.length - 1) {
                e.alive = false;
                // Leak cost used to be the raw tier, so a T5 cost 5 of 20
                // lives -- under a wave-10 mix that is 4.4 lives per leak and
                // four and a half leaks end a full-health run, across ten
                // waves rather than five. Banded 1 / 2 / 3 instead.
                gameState.lives = Math.max(0, gameState.lives - leakCost(e.type.tier));
                // Counted separately: this used to increment enemiesKilled, so
                // the HUD could read "10/10 enemies" on a wave where you killed
                // four and lost the rest.
                SFX.leak();
                gameState.enemiesLeaked++;
                gameState.enemiesLeft--;

                // Send multiplayer update for shared lives
                if (gameConfig.isMultiplayer) {
                    multiplayerManager.sendMessage('gameState', {
                        lives: gameState.lives,
                        wave: gameState.wave
                    });
                }

                // HUD is written once per frame by syncUIFromState()
            }
        } else {
            e.x += moveSpeed * dx / dist;
            e.y += moveSpeed * dy / dist;
        }
    }

    // Towers shoot
    for (const t of towers) {
        if (now - t.lastShot < towerRate(t)) continue;

        const range = towerRange(t);
        const inRange = enemies.filter(e => e.alive && Math.hypot(e.x - t.x, e.y - t.y) < range);
        if (!inRange.length) { t.focus = null; t.stacks = 0; continue; }

        let target;
        if (t.type.name === 'Archer' && doctrines['Archer']) {
            // MARKSMAN is itself the targeting rule. Without that it reads an
            // input the engine overwrites: spawn spacing is 0.9 s for every
            // tier, so a new enemy inherits the leader slot every few shots
            // and the stack never exceeds 2. Holding the target is also what
            // makes it cost something -- this Archer stops defending against
            // leakers.
            target = (t.focus && t.focus.alive && inRange.includes(t.focus))
                ? t.focus
                : leaderOf(inRange);
        } else if (t.type.name === 'Cannon' && doctrines['Cannon']) {
            target = densestOf(inRange);
        } else {
            target = leaderOf(inRange);
        }
        if (!target) continue;

        if (t.type.name === 'Archer' && doctrines['Archer']) {
            t.stacks = (t.focus === target) ? Math.min((t.stacks || 0) + 1, MARKSMAN_CAP) : 0;
        }
        t.focus = target;

        let dmg = towerDamage(t) * executionerMultiplier(t, target);
        if (t.type.name === 'Archer' && doctrines['Archer']) {
            dmg *= 1 + MARKSMAN_STEP * (t.stacks || 0);
        }

        if (gameConfig.isMultiplayer) pendingShots.push([t.id, target.id]);
        SFX.shoot(t.type.bulletType);

        if (t.type.bulletType === 'flame') {
            // Fire is hitscan and pushes no bullet.
            damageEnemy(target, dmg, '#ff8c00', t.placedBy);
            if (doctrines['Fire Tower']) {
                // CINDER: refresh, never stack.
                const burn = cinderDps(t);
                target.burnDps = Math.max(target.burnDps || 0, burn);
                target.burnTimer = CINDER_MS;
                target.burnTower = t;
            }
        } else {
            bullets.push({
                x: t.x,
                y: t.y,
                tx: target.x,
                ty: target.y,
                dmg: dmg,
                target: target,
                color: t.type.color,
                speed: t.type.bulletType === 'arrow' ? 12 :
                       t.type.bulletType === 'sniper' ? 20 : 6,
                aoeRadius: t.type.aoeRadius || 0,
                clusterBonus: (t.type.name === 'Cannon' && doctrines['Cannon']),
                type: t.type.bulletType,
                tower: t,
            });
        }

        t.lastShot = now;
    }

    // Projectile movement and collision
    for (const b of bullets) {
        // Explosions are pure visuals with no target. Without their own branch
        // they fall through to the projectile case, where b.tx is undefined,
        // dist is NaN and the miss test marks them hit on the same step they
        // are created -- which is why "Explode!" never drew a single pixel.
        if (b.type === "explosion") {
            b.lifetime -= dt;
            if (b.lifetime <= 0) b.hit = true;
            continue;
        }
        if (b.type === "zap") {
            if (b.lifetime <= 0) {
                // Apply damage when zap expires
                if (b.target && b.target.alive) {
                    damageEnemy(b.target, b.dmg, "#ffff66", b.tower?.placedBy);
                }
                b.hit = true;
            } else {
                b.lifetime -= dt;
            }
        }
        // (Removed: a "flame" projectile branch. The Fire Tower is hitscan --
        // the shot code explicitly skips bullet creation for bulletType
        // "flame" -- so no bullet of that type has ever existed and neither
        // this branch nor its draw counterpart could ever run.)
        else {
            // Track the target instead of flying at a frozen snapshot of where
            // it stood when the shot was fired. Without this the projectile
            // lands behind a moving enemy while the damage lands on the enemy,
            // which reads as broken hit detection. Keep the last known point
            // when the target dies mid-flight so the shot still completes.
            if (b.target?.alive) {
                b.tx = b.target.x;
                b.ty = b.target.y;
            }

            let dx = b.tx - b.x, dy = b.ty - b.y, dist = Math.hypot(dx, dy);
            if (dist < b.speed || !b.target?.alive) {
                // Handle AOE damage (for Cannon's Explode!)
                // Splash is a BASE property of the Cannon, not a purchase --
                // aoeRadius already sits on the type and the type's own
                // comment calls it "AOE damage". The primary target is
                // excluded: it is inside its own blast by definition, so it
                // used to take 0.7x splash AND full damage, 170% total, which
                // made the one area tower a single-target booster first.
                if (b.aoeRadius > 0) {
                    const radius = b.clusterBonus ? CLUSTER_RADIUS : b.aoeRadius;
                    const aoeTargets = enemies.filter(e =>
                        e.alive && e !== b.target &&
                        Math.hypot(e.x - b.x, e.y - b.y) < radius);

                    // CLUSTER MUNITION: the more bodies caught, the harder
                    // each one is hit -- the only effect in the game keyed to
                    // how the enemies are arranged relative to each other.
                    const bonus = b.clusterBonus
                        ? 1 + CLUSTER_STEP * Math.min(aoeTargets.length, CLUSTER_CAP)
                        : 1;

                    aoeTargets.forEach(e => damageEnemy(e, b.dmg * 0.6 * bonus, '#ff7043', b.tower?.placedBy));

                    // Create explosion effect
                    bullets.push({
                        x: b.x,
                        y: b.y,
                        radius: b.aoeRadius,
                        type: "explosion",
                        lifetime: 300   // ms (was a 30-frame counter)
                    });
                }

                // Handle direct damage
                if (b.target && b.target.alive) {
                    const clusterBonus = b.clusterBonus
                        ? 1 + CLUSTER_STEP * Math.min(
                            enemies.filter(e => e.alive && e !== b.target &&
                                Math.hypot(e.x - b.x, e.y - b.y) < CLUSTER_RADIUS).length,
                            CLUSTER_CAP)
                        : 1;
                    damageEnemy(b.target, b.dmg * clusterBonus, undefined, b.tower?.placedBy);

                    // Handle piercing for sniper tower
                    if (b.pierce) {
                        // Find another target in range
                        const nextTarget = enemies.find(e => 
                            e.alive && 
                            e !== b.target &&
                            Math.hypot(e.x - b.x, e.y - b.y) < towerRange(b.tower));

                        if (nextTarget) {
                            bullets.push({
                                x: b.x,
                                y: b.y,
                                tx: nextTarget.x,
                                ty: nextTarget.y,
                                dmg: b.dmg, // Full damage to second target
                                target: nextTarget,
                                color: b.tower.type.color,
                                speed: 20,
                                type: "sniper",
                                tower: b.tower
                            });
                        }
                    }
                }

                b.hit = true;
            } else {
                b.x += b.speed * dx / dist;
                b.y += b.speed * dy / dist;
            }
        }
    }

    updateEffects(dt);

    // Cleanup
    bullets = bullets.filter(b => !b.hit && (!b.lifetime || b.lifetime > 0));

    // Reward for killing enemies and handle tier downgrades
    let killed = enemies.filter(e => e.hp <= 0 && e.alive);
    if (killed.length > 0) {
        let totalGold = 0;
        let totalCrystals = 0;

        const hpMultiplier = waveHpScale();

        for (const e of killed) {
            // Walk the tier ladder down in one go. Two losses are fixed here:
            //
            //  - Gold. The old code overwrote e.goldValue with the LOWER tier's
            //    value on every downgrade and only paid out on the final
            //    tier-1 death, so every enemy in the game paid exactly 10 gold
            //    and the 20/35/55/80 values on T2-T5 were unreachable dead
            //    data. Paying the tier you just broke makes the cumulative
            //    payouts 10 / 30 / 65 / 120 / 200.
            //
            //  - Overkill. Damage above the enemy's remaining HP was discarded,
            //    so a T3 took exactly three shots whether you dealt 700 damage
            //    or 10,000. The surplus now carries into the next tier, so one
            //    big hit can punch through several tiers in a single step.
            while (e.hp <= 0 && e.currentTier > 1) {
                const overkill = -e.hp;
                const brokenTier = e.type;

                creditGold(e, e.goldValue);                     // the tier just broken
                totalGold += e.goldValue;

                const newTier = enemyTiers[e.currentTier - 2];
                e.type = newTier;
                e.currentTier = newTier.tier;
                e.maxHp = newTier.hp * hpMultiplier;            // full, so the bar is honest
                e.hp = e.maxHp - overkill;
                e.goldValue = newTier.goldValue;

                e.lastBlink = Date.now();
                e.blinkColor = "#ffffff";

                // Burst in the colour of the tier that just broke, so the
                // player can see the ladder being walked down.
                SFX.downgrade(brokenTier.tier);
                spawnBurst(e.x, e.y, brokenTier.color, 10);
                spawnFloatingText(e.x, e.y - 14, '+' + brokenTier.goldValue, '#ffd479');
            }

            if (e.hp <= 0) {
                e.alive = false;
                SFX.kill();
                spawnBurst(e.x, e.y, e.type.color, 14);
                spawnFloatingText(e.x, e.y - 14, '+' + e.goldValue, '#ffd479');
                creditGold(e, e.goldValue);
                totalGold += e.goldValue;
                gameState.enemiesLeft--;
                gameState.enemiesKilled++;
            }
        }

        // totalGold was accumulated across every enemy resolved this step;
        // it is credited per enemy inside the loop instead, so the kills go
        // to the right purse.
        gameState.crystals += totalCrystals;
        // HUD is written once per frame by syncUIFromState()
    }

    // Clean up dead enemies (only T1 enemies can actually die)
    enemies = enemies.filter(e => e.alive);

    // Check if wave is complete. No DOM here: updateUI() already derives the
    // wave counter and the Start button from gameState once per frame.
    if (gameState.enemiesInWave == 0 && enemies.length == 0 && gameState.waveActive) {
        gameState.waveActive = false;

        // Crystals are deterministic: random income cannot support a price
        // ladder. With sigma ~4.3 a lucky run buys all six doctrines and the
        // choice disappears. +1 per wave, +1 more for a clean wave from 3 on,
        // which gives 13 spendable by wave 10 on a leaky run and 20 flawless
        // -- three doctrines, or four if you play well, never five.
        gameState.crystals += 1;
        if (gameState.wave >= 3 && gameState.enemiesLeaked === 0) gameState.crystals += 1;

        if (gameState.wave < MAX_WAVE) {
            gameState.wave++;
        } else {
            // Final wave cleared. The old code fell into an else that only
            // relabelled two text nodes and re-enabled Start, so the last wave
            // replayed forever -- an endless gold and crystal farm that made
            // the lifetime budget meaningless. This is the missing win state.
            gameState.phase = 'won';
            SFX.won();
            recordWin();
            broadcastGameOver(true,
                `Alle ${MAX_WAVE} Wellen geschafft. ${gameState.lives}/${LIFE_MAX} Leben übrig.`);
            showDialog(
                `Alle ${MAX_WAVE} Wellen geschafft. ${gameState.lives}/${LIFE_MAX} Leben übrig, ${Math.floor(gameState.gold)} Gold auf der Hand.`,
                'Gewonnen',
                resetToTitle
            );
            return;
        }
    }

    // Game over
    if (gameState.lives <= 0) {
        gameState.phase = 'over';
        SFX.lost();
        broadcastGameOver(false,
            `Die Basis ist gefallen in Welle ${gameState.wave}.`);
        showDialog(
            `Die Basis ist gefallen in Welle ${gameState.wave}. ${gameState.enemiesKilled} Gegner erledigt.`,
            'Verloren',
            resetToTitle
        );
    }
}

// Modal dialog. A native alert() blocks the animation frame chain, and fired
// from inside the loop it re-opens every frame forever -- which is exactly
// what the old Game Over did. Text goes in via textContent, not innerHTML.
function showDialog(message, title = 'Hinweis', onOk = null) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';

    const box = document.createElement('div');
    box.className = 'custom-alert';
    box.innerHTML = '<h3></h3><p></p><div class="custom-alert-buttons">' +
                    '<button class="custom-alert-btn retry">OK</button></div>';
    box.querySelector('h3').textContent = title;
    box.querySelector('p').textContent = message;

    box.querySelector('.retry').addEventListener('click', () => {
        overlay.remove();
        box.remove();
        if (onOk) onOk();
    });

    document.body.appendChild(overlay);
    document.body.appendChild(box);
}

// UI functions
function updateUI() {
    // Core resources
    // Gold, and the build budget beside it. A tower count would be the wrong
    // readout -- points are weighted, so 12 Archers and 3 Snipers are the
    // same spend of board.
    let goldText = `${Math.max(0, Math.floor(gameState.gold))}`;
    if (gameConfig.isMultiplayer) {
        // Your purse first, then theirs -- you need to know whether your
        // partner can afford the tower you are about to ask them for.
        const other = myRole() === 'host' ? 'guest' : 'host';
        goldText += ` (${Math.max(0, Math.floor(purses[other] || 0))})`;
    }
    goldEl.textContent = `${goldText}  ·  ${usedPoints()}/${BUILD_POINTS}`;
    crystalEl.textContent = Math.max(0, Math.floor(gameState.crystals));
    lifeEl.textContent = `${Math.max(0, gameState.lives)}/${LIFE_MAX}`;

    // Wave information
    waveNumEl.textContent = `${Math.min(gameState.wave, MAX_WAVE)}/${MAX_WAVE}`;
    if (gameState.waveActive) {
        const total = gameState.enemiesTotal || gameState.enemiesInWave || 0;
        enemiesKilledEl.textContent = `${gameState.enemiesKilled}/${total}`;
    } else if (gameState.nextWaveEnemies) {
        enemiesKilledEl.textContent = `${gameState.nextWaveEnemies} next`;
    } else {
        const total = gameState.enemiesTotal || gameState.enemiesInWave || 0;
        enemiesKilledEl.textContent = `${gameState.enemiesKilled}/${total}`;
    }

    // Derived, not commanded: a wave ending, a win and a loss all agree,
    // and there is no code path that can leave the button in a stale state.
    startButton.disabled = gameState.waveActive || gameState.phase !== 'playing';

    // Multiplayer indicators
    const indicator = document.getElementById('playerIndicators');
    if (gameConfig.isMultiplayer) {
        const playerNumber = gameState.playerNumber || (gameConfig.playerRole === 'host' ? 1 : 2);
        document.getElementById('playerNumber').textContent = playerNumber;

        const connectedCount = multiplayerManager ? multiplayerManager.connectedPlayers.size : 0;
        document.getElementById('connectedPlayers').textContent = `${Math.min(connectedCount, 2)}/2`;

        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

// Called once per rendered frame from mainLoop. The simulation writes no DOM
// of its own, so five catch-up steps cost one HUD update, not five.
function syncUIFromState() {
    updateUI();
}

// Upgrade menu
// Which tracks a tower offers. Ice trades the damage track for slow -- its
// job is control, and a damage track would only blur that.
function towerTracks(t) {
    return (t.type.slowFactor !== undefined)
        ? ['slow', 'rate', 'range']
        : ['dmg', 'rate', 'range'];
}

const TRACK_META = {
    dmg:   { icon: '💥', label: 'Schaden' },
    rate:  { icon: '⏱️', label: 'Feuerrate' },
    range: { icon: '📏', label: 'Reichweite' },
    slow:  { icon: '❄️', label: 'Verlangsamung' },
};

function dpsOf(t) { return towerDamage(t) / (towerRate(t) / 1000); }

// What one more level of a track would actually do, as "before -> after".
// The old panel showed the raw step value, which told you nothing about what
// you were buying.
function trackPreview(t, track) {
    const lv = t.upgrades[track + 'Lv'] || 0;
    const probe = { type: t.type, upgrades: Object.assign({}, t.upgrades, { [track + 'Lv']: lv + 1 }) };
    if (track === 'dmg' || track === 'rate') {
        return 'DPS ' + dpsOf(t).toFixed(1) + ' → ' + dpsOf(probe).toFixed(1);
    }
    if (track === 'range') {
        return Math.round(towerRange(t)) + ' → ' + Math.round(towerRange(probe));
    }
    if (track === 'slow') {
        const a = Math.round((1 - towerSlowFactor(t)) * 100);
        const b = Math.round((1 - towerSlowFactor(probe)) * 100);
        return a + '% → ' + b + '% langsamer';
    }
    return '';
}

function showUpgradeMenu(tower, clickX, clickY) {
    const special = tower.type.upgrades.special;

    let statsHTML = `
    <div class="tower-stats">
        <h3>${tower.type.name} (Stufe ${tower.level || 1})</h3>
        <div class="stat-row">
            <span class="stat-name">Schaden:</span>
            <span class="stat-value">${towerDamage(tower).toFixed(1)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-name">DPS:</span>
            <span class="stat-value">${dpsOf(tower).toFixed(1)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-name">Reichweite:</span>
            <span class="stat-value">${Math.round(towerRange(tower))}</span>
        </div>
        <div class="stat-row">
            <span class="stat-name">Feuerrate:</span>
            <span class="stat-value">${(1000 / towerRate(tower)).toFixed(2)}/s</span>
        </div>`;

    if (tower.type.slowFactor !== undefined) {
        // The REDUCTION, not the multiplier. The old panel printed the raw
        // multiplier climbing past 100%, which read as an improvement while
        // the upgrade was in fact removing the slow and then speeding
        // enemies up.
        statsHTML += `
        <div class="stat-row">
            <span class="stat-name">Verlangsamung:</span>
            <span class="stat-value">${Math.round((1 - towerSlowFactor(tower)) * 100)}% langsamer</span>
        </div>`;
    }

    if (tower.type.aoeRadius) {
        statsHTML += `
        <div class="stat-row">
            <span class="stat-name">Splash:</span>
            <span class="stat-value">${tower.type.aoeRadius} px</span>
        </div>`;
    }

    if (special && doctrines[tower.type.name]) {
        statsHTML += `
        <div class="stat-row">
            <span class="stat-name">Doktrin:</span>
            <span class="stat-value">${special.name} (aktiv)</span>
        </div>`;
    }

    if (gameConfig.isMultiplayer && tower.placedBy) {
        statsHTML += `
        <div class="stat-row">
            <span class="stat-name">Gebaut von:</span>
            <span class="stat-value">${tower.placedBy === 'host' ? 'Host' : 'Gast'}</span>
        </div>`;
    }

    statsHTML += `</div><div class="upgrade-options">`;

    let upgradeOptions = '';
    for (const track of towerTracks(tower)) {
        const lv = tower.upgrades[track + 'Lv'] || 0;
        const meta = TRACK_META[track];

        if (lv >= UPG_MAX) {
            upgradeOptions += `
            <button class="upgrade-option" data-upgrade="${track}" disabled>
                <span>${meta.icon}</span>
                <span class="upgrade-name">${meta.label} ${lv}/${UPG_MAX}</span>
                <span class="upgrade-description">ausgebaut</span>
            </button>`;
            continue;
        }

        const price = upgradePrice(tower, track);
        upgradeOptions += `
        <button class="upgrade-option" data-upgrade="${track}" ${gameState.gold < price ? 'disabled' : ''}>
            <span>${meta.icon}</span>
            <span class="upgrade-name">${meta.label} ${lv}/${UPG_MAX}</span>
            <span class="upgrade-description">${trackPreview(tower, track)}</span>
            <span class="upgrade-cost">${price} Gold</span>
        </button>`;
    }

    if (special) {
        upgradeOptions += `
        <button class="upgrade-option" data-upgrade="special"
            ${(gameState.crystals < special.cost || doctrines[tower.type.name]) ? 'disabled' : ''}>
            <span>✨</span>
            <span class="upgrade-name">${special.name}${doctrines[tower.type.name] ? ' ✓' : ''}</span>
            <span class="upgrade-description">${special.description}<br><em>Gilt für alle ${tower.type.name}, auch später gebaute.</em></span>
            <span class="upgrade-cost">${special.cost} Kristalle</span>
        </button>`;
    }

    // Selling is mandatory once the board is capped: without it a misplaced
    // Sniper is 4 of your 36 build points gone for the rest of the run. It is
    // also what makes the opening Archer rush correct play rather than a
    // trap -- on a full board, selling 12 Archers frees 12 points and 210
    // gold, which buys 4 Mages for 440, and army damage goes 10,296 -> 14,280.
    upgradeOptions += `
    <button class="upgrade-option sell-option" data-upgrade="sell">
        <span>💰</span>
        <span class="upgrade-name">Verkaufen</span>
        <span class="upgrade-description">gibt ${tower.type.buildCost} Baupunkte frei</span>
        <span class="upgrade-cost">+${sellValue(tower)} Gold</span>
    </button>`;

    // Combine stats and upgrade options
    upgradeMenu.innerHTML = statsHTML + upgradeOptions + '</div>';
    upgradeMenu.style.display = 'grid';
    upgradeMenu.style.left = '20px';
    upgradeMenu.style.bottom = '80px';

    const buttons = upgradeMenu.querySelectorAll('.upgrade-option');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();

            const upgradeType = this.getAttribute('data-upgrade');

            // Same discipline as placement: no privileged mutation path. The
            // host's click and the guest's message both land in applyX().
            if (upgradeType === 'sell') {
                submitIntent('sellTower', { id: tower.id });
                selectedTower = null;
                upgradeMenu.style.display = 'none';
                updateUI();
                return;
            }

            submitIntent('upgradeTower', { id: tower.id, track: upgradeType });

            updateUI();
            showUpgradeMenu(tower, clickX, clickY);
        });
    });

    const closeMenu = function(e) {
        if (!upgradeMenu.contains(e.target)) {
            upgradeMenu.style.display = 'none';
            selectedTower = null;
            document.removeEventListener('mousedown', closeMenu);
        }
    };

    document.addEventListener('mousedown', closeMenu);
}

// Click handler
function handleCanvasClick(evt) {
    evt.preventDefault();

    // A TouchEvent has no clientX, so x and y were NaN and every hit test
    // below failed silently: on a phone you could place towers but never open
    // one to upgrade it, which made the whole upgrade system unreachable on
    // mobile. The drag code has always done this correctly.
    const p = evt.touches?.[0] ?? evt.changedTouches?.[0] ?? evt;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (p.clientX - rect.left) * (canvas.width / rect.width);
    const y = (p.clientY - rect.top) * (canvas.height / rect.height);

    // Check if an enemy was clicked
    for (let e of enemies) {
        const dist = Math.hypot(x - e.x, y - e.y);
        if (dist <= 15) {  // Enemy click radius
            showEnemyInfo(e);
            return;
        }
    }

    // Check if a tower was clicked
    for (let t of towers) {
        const dist = Math.hypot(x - t.x, y - t.y);
        if (dist <= 25) {  // Larger click radius
            selectedTower = t;
            showUpgradeMenu(t, x, y);
            return;
        }
    }

    // If no tower clicked, hide menus
    upgradeMenu.style.display = 'none';
    selectedTower = null;
}

// Draw enemy info when clicked
function showEnemyInfo(enemy) {
    const hpMultiplier = gameConfig.difficulties[gameConfig.difficulty].enemyHpMultiplier;
    const baseHp = enemy.type.hp;
    const currentHp = enemy.hp;
    const maxHp = enemy.maxHp;

    upgradeMenu.innerHTML = `
        <div class="tower-stats">
            <h3>${enemy.type.name}</h3>
            <div class="stat-row">
                <span class="stat-name">Tier:</span>
                <span class="stat-value">${enemy.type.tier}</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">HP:</span>
                <span class="stat-value">${Math.round(currentHp)}/${Math.round(maxHp)} (Base: ${baseHp})</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">Speed:</span>
                <span class="stat-value">${enemy.type.speed.toFixed(2)} ${enemy.slowAmount < 1 ? `(Slowed: ${(enemy.type.speed * enemy.slowAmount).toFixed(2)})` : ''}</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">Gold Reward:</span>
                <span class="stat-value">${chainGold(enemy.currentTier)}</span>
            </div>
            ${enemy.currentTier !== enemy.originalTier ? `
            <div class="stat-row">
                <span class="stat-name">Downgraded:</span>
                <span class="stat-value">T${enemy.currentTier} (from T${enemy.originalTier})</span>
            </div>` : ''}
            ${enemy.freezeTimer > 0 ? `
            <div class="stat-row">
                <span class="stat-name">Status:</span>
                <span class="stat-value">Frozen (${(enemy.freezeTimer/1000).toFixed(1)}s remaining)</span>
            </div>` : ''}
        </div>
    `;

    upgradeMenu.style.display = 'grid';
    upgradeMenu.style.left = '20px';
    upgradeMenu.style.bottom = '80px';

    const closeMenu = function(e) {
        if (!upgradeMenu.contains(e.target)) {
            upgradeMenu.style.display = 'none';
            document.removeEventListener('mousedown', closeMenu);
        }
    };

    document.addEventListener('mousedown', closeMenu);
}

// Drawing functions
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw path (for all maps)
    ctx.save();
    ctx.strokeStyle = "#5a3310";
    ctx.lineWidth = 32;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.shadowColor = "#40240a";
    ctx.shadowBlur = 18;
    ctx.stroke();

    // Draw path outline
    ctx.strokeStyle = "#7B4A20";
    ctx.lineWidth = 24;
    ctx.shadowColor = "transparent";
    ctx.stroke();
    ctx.restore();

    // Decorative elements
    for (const el of mapElements) {
        ctx.save();
        ctx.globalAlpha = el.a;

        if (el.type.includes('rock')) {
            ctx.save();
            ctx.globalAlpha = el.a;
            ctx.beginPath();

            switch(el.shape) {
                case 0: // Round rock
                    ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2);
                    break;
                case 1: // Angular rock
                    ctx.moveTo(el.x - el.r, el.y - el.r * 0.6);
                    ctx.lineTo(el.x + el.r * 0.7, el.y - el.r);
                    ctx.lineTo(el.x + el.r, el.y + el.r * 0.5);
                    ctx.lineTo(el.x - el.r * 0.5, el.y + el.r);
                    ctx.closePath();
                    break;
                case 2: // Oval rock
                    ctx.ellipse(el.x, el.y, el.r, el.r * 0.7, 0.4, 0, Math.PI * 2);
                    break;
            }

            // Fill and stroke
            ctx.fillStyle = '#a0a0a0';
            ctx.fill();
            ctx.strokeStyle = '#707070';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
        else if (el.type.includes('tree')) {
            if (el.type === 'tree1') {
                ctx.beginPath();
                ctx.arc(el.x, el.y, el.r*0.6, 0, Math.PI*2);
                ctx.fillStyle = "#287d3c";
                ctx.shadowColor = "#1a3819";
                ctx.shadowBlur = 13;
                ctx.fill();

                ctx.beginPath();
                ctx.rect(el.x-3, el.y+el.r*0.4, 6, 10);
                ctx.fillStyle = "#86592d";
                ctx.shadowBlur = 0;
                ctx.fill();
            }
            else if (el.type === 'tree2') {
                ctx.beginPath();
                ctx.moveTo(el.x, el.y-el.r*0.4);
                ctx.lineTo(el.x-el.r*0.47, el.y+el.r*0.27);
                ctx.lineTo(el.x+el.r*0.47, el.y+el.r*0.27);
                ctx.closePath();
                ctx.fillStyle = "#196a2e";
                ctx.shadowColor = "#0c3c16";
                ctx.shadowBlur = 11;
                ctx.fill();

                ctx.beginPath();
                ctx.rect(el.x-2.5, el.y+el.r*0.27, 5, 11);
                ctx.fillStyle = "#68481d";
                ctx.shadowBlur = 0;
                ctx.fill();
            }
            else if (el.type === 'tree3') {
                ctx.beginPath();
                ctx.ellipse(el.x, el.y, el.r*0.5, el.r*0.36, 0.4, 0, Math.PI*2);
                ctx.fillStyle = "#50b93e";
                ctx.shadowColor = "#1a3819";
                ctx.shadowBlur = 8;
                ctx.fill();

                ctx.beginPath();
                ctx.rect(el.x-2.5, el.y+el.r*0.2, 5, 8);
                ctx.fillStyle = "#ad8323";
                ctx.shadowBlur = 0;
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Draw towers
    for (const t of towers) {
        if (!t) continue; // Skip if tower is null

        ctx.save();

        // Tower base
        ctx.beginPath();
        ctx.roundRect(t.x - 24, t.y - 24, 48, 48, 12);
        ctx.fillStyle = t.type.color;
        ctx.fill();

        // Black outline
        ctx.beginPath();
        ctx.roundRect(t.x - 24, t.y - 24, 48, 48, 12);
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw player indicator for multiplayer
        if (gameConfig.isMultiplayer && t.placedBy) {
            ctx.beginPath();
            ctx.arc(t.x + 20, t.y - 20, 10, 0, Math.PI * 2);
            ctx.fillStyle = t.placedBy === 'host' ? '#3498db' : '#e74c3c';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t.placedBy === 'host' ? '1' : '2', t.x + 20, t.y - 20);
        }

        if (t.type.iconImage) {
            ctx.drawImage(t.type.iconImage, t.x - 25, t.y - 25, 50, 50);
        } else {
            // Fallback: simple "T" shape
            ctx.fillStyle = "#fff";
            ctx.fillRect(t.x - 8, t.y - 12, 16, 24); // Vertical
            ctx.fillRect(t.x - 12, t.y + 4, 24, 8);   // Horizontal
        }

        ctx.restore();

        // Fire tower effects
        if (t.type.name === "Fire Tower" && simTime - t.lastShot < 100) {
            const tgt = enemies.find(e => e.alive && Math.hypot(e.x-t.x, e.y-t.y) < towerRange(t));
            if (tgt) {
                const angle = Math.atan2(tgt.y - t.y, tgt.x - t.x);
                const distance = Math.hypot(tgt.x - t.x, tgt.y - t.y);
                const flameLength = Math.min(towerRange(t), distance);

                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(angle);

                // Flame gradient
                const flameGradient = ctx.createLinearGradient(0, 0, flameLength, 0);
                flameGradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
                flameGradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.7)');
                flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

                ctx.beginPath();
                ctx.moveTo(24, 0);
                ctx.lineTo(flameLength, -t.type.flameWidth);
                ctx.lineTo(flameLength, t.type.flameWidth);
                ctx.closePath();
                ctx.fillStyle = flameGradient;
                ctx.fill();

                // Inner flame
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(flameLength, -t.type.flameWidth * 0.6);
                ctx.lineTo(flameLength, t.type.flameWidth * 0.6);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
                ctx.fill();

                ctx.restore();
            }
        }
    }

    // Attack radius of selected tower
    if (selectedTower) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(selectedTower.x, selectedTower.y, towerRange(selectedTower), 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw dragging tower
    if (draggingTower) {
        ctx.save();
        ctx.globalAlpha = 0.8;

        // Check if position is valid
        const valid = isValidTowerPosition(draggingTower.x, draggingTower.y);
        ctx.strokeStyle = valid ? "#0f0" : "#f00";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        // Draw tower base
        ctx.beginPath();
        ctx.roundRect(
            draggingTower.x - draggingTower.width/2,
            draggingTower.y - draggingTower.height/2,
            draggingTower.width,
            draggingTower.height,
            12
        );
        ctx.fillStyle = draggingTower.type.color;
        ctx.fill();
        ctx.stroke();

        // Draw the tower icon
        if (draggingTower.type.iconImage) {
            ctx.drawImage(draggingTower.type.iconImage, draggingTower.x - 25, draggingTower.y - 25, 50, 50);
        } else {
            // Fallback: draw SVG icon
            ctx.fillStyle = "#fff";
            ctx.fillRect(draggingTower.x - 8, draggingTower.y - 12, 16, 24);
            ctx.fillRect(draggingTower.x - 12, draggingTower.y + 4, 24, 8);
        }

        // Draw attack radius
        ctx.strokeStyle = valid ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.fillStyle = valid ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(draggingTower.x, draggingTower.y, draggingTower.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Optional pulsating effect
        const pulseSize = Math.sin(Date.now() / 200) * 5 + 5;
        ctx.strokeStyle = valid ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(draggingTower.x, draggingTower.y, draggingTower.range + pulseSize, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Draw all enemies with optimized code
    for (const e of enemies) {
        const isBlinking = e.lastBlink && Date.now() - e.lastBlink < 100;
        const isSelected = upgradeMenu.style.display !== 'none' && 
                        upgradeMenu.textContent.includes(e.type.name);
        const isFrozen = e.freezeTimer > 0;

        // Draw enemy body
        if (isSelected) {
            // Highlight selected enemy with yellow glow
            ctx.fillStyle = "#ffff00";
            ctx.beginPath();
            ctx.arc(e.x, e.y, 18, 0, 2*Math.PI);
            ctx.fill();

            // Draw actual enemy color inside highlight
            ctx.fillStyle = isBlinking ? "#ffffff" : e.type.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 15, 0, 2*Math.PI);
            ctx.fill();
        } else {
            // Normal enemy drawing
            ctx.fillStyle = isBlinking ? "#ffffff" : e.type.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 15, 0, 2*Math.PI);
            ctx.fill();
        }

        // Draw health bar (always visible)
        ctx.fillStyle = "#222";
        ctx.fillRect(e.x-16, e.y-18, 32, 5);
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(e.x-16, e.y-18, 32*e.hp/e.maxHp, 5);

        // Draw tier indicator (always visible)
        ctx.fillStyle = isBlinking ? "#fff" : "#fff";
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6, 0, 2*Math.PI);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(e.currentTier, e.x, e.y);

        // Draw freeze effect if frozen
        if (isFrozen) {
            ctx.strokeStyle = "#a0e1ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Projectiles
    for (const b of bullets) {
        if (b.type === "arrow") {
            const angle = Math.atan2(b.ty - b.y, b.tx - b.x);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-15, -5);
            ctx.lineTo(-15, 5);
            ctx.closePath();
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.restore();
        }
        // (Removed: the unreachable flame projectile draw path.)
        else if (b.type === "cannonball") {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
            const cannonGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 8);
            cannonGrad.addColorStop(0, '#666');
            cannonGrad.addColorStop(0.5, '#FF8C00');
            cannonGrad.addColorStop(1, '#FF4500');
            ctx.fillStyle = cannonGrad;
            ctx.fill();

            if (b.hit && b.aoeRadius > 0) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.aoeRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 165, 0, 0.3)`;
                ctx.fill();
            }
        }
        else if (b.type === "ice") {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
            const iceGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
            iceGrad.addColorStop(0, '#a0e1ff');
            iceGrad.addColorStop(1, '#007acc');
            ctx.fillStyle = iceGrad;
            ctx.fill();

            // Snowflake effect
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.x - 4, b.y);
            ctx.lineTo(b.x + 4, b.y);
            ctx.moveTo(b.x, b.y - 4);
            ctx.lineTo(b.x, b.y + 4);
            ctx.stroke();
        }
        else if (b.type === "sniper") {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            const sniperGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 4);
            sniperGrad.addColorStop(0, '#aaaaaa');
            sniperGrad.addColorStop(1, '#333333');
            ctx.fillStyle = sniperGrad;
            ctx.fill();

            // Crosshair effect
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.x - 6, b.y);
            ctx.lineTo(b.x + 6, b.y);
            ctx.moveTo(b.x, b.y - 6);
            ctx.lineTo(b.x, b.y + 6);
            ctx.stroke();
        }
        else if (b.type === "zap") {
            // Draw lightning bolt effect
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);

            // Create jagged lightning effect
            const segments = 5;
            const dx = (b.tx - b.x) / segments;
            const dy = (b.ty - b.y) / segments;

            for (let i = 1; i <= segments; i++) {
                const offsetX = (Math.random() - 0.5) * 15;
                const offsetY = (Math.random() - 0.5) * 15;
                ctx.lineTo(
                    b.x + dx * i + offsetX,
                    b.y + dy * i + offsetY
                );
            }

            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Glow effect
            ctx.strokeStyle = "rgba(255, 255, 150, 0.7)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        else if (b.type === "explosion") {
            const gradient = ctx.createRadialGradient(
                b.x, b.y, 0,
                b.x, b.y, b.radius
            );
            gradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
            gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Inner explosion
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
            ctx.fill();

            // aged in stepSimulation, not here -- the renderer must not drive the clock
        }
        else {
            // Default projectile (magic)
            ctx.beginPath();
            ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();
        }
    }

    // Start/end arrows
    drawArrow(path[0].x, path[0].y, Math.atan2(path[1].y-path[0].y, path[1].x-path[0].x), "#21c84c");
    drawArrow(path[path.length-1].x, path[path.length-1].y,
              Math.atan2(path[path.length-1].y-path[path.length-2].y,
                        path[path.length-1].x-path[path.length-2].x), "#e32c1c");

    // Curse zones. Without a visible radius this is an invisible purchase
    // and therefore a trap -- the player cannot tell whether a Mage is
    // covering the corner they care about.
    if (doctrines['Mage']) {
        for (const t of towers) {
            if (t.type.name !== 'Mage') continue;
            ctx.save();
            ctx.beginPath();
            ctx.arc(t.x, t.y, CURSE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(156, 39, 176, 0.07)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(186, 104, 200, 0.35)';
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Cluster Munition deliberately ignores the leader to hit the pack. Mark
    // the enemy it chose, or the first time that costs a life it reads as a
    // malfunction rather than a decision.
    if (doctrines['Cannon']) {
        for (const t of towers) {
            if (t.type.name !== 'Cannon' || !t.focus?.alive) continue;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 112, 67, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(t.focus.x, t.focus.y, 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(t.focus.x - 26, t.focus.y); ctx.lineTo(t.focus.x - 14, t.focus.y);
            ctx.moveTo(t.focus.x + 14, t.focus.y); ctx.lineTo(t.focus.x + 26, t.focus.y);
            ctx.moveTo(t.focus.x, t.focus.y - 26); ctx.lineTo(t.focus.x, t.focus.y - 14);
            ctx.moveTo(t.focus.x, t.focus.y + 14); ctx.lineTo(t.focus.x, t.focus.y + 26);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Sparks and floating numbers last, so they sit on top of everything.
    drawEffects();
}

function drawArrow(x, y, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-18, -14);
    ctx.lineTo(12, 0);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.restore();
}

// Event listeners
window.addEventListener('load', function() {
    resizeCanvas();
    updateUI();

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });

    startButton.addEventListener('click', function() {
        submitIntent('startWave', {});
    });

    window.addEventListener('resize', resizeCanvas);
});

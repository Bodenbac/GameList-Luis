/**
 * BlackJack Game Logic
 * Ported from Java implementation with modern web features
 */

class BlackJackGame {
    constructor(options = {}) {
        const { autoStart = true } = options;
        this.autoStart = autoStart;
        this.deck = new Deck();
        this.playerCards = [];
        this.dealerCards = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.gameState = 'INITIAL'; // INITIAL, DEALING, PLAYER_TURN, DEALER_TURN, GAME_OVER
        this.isPlayerPlaying = true;
        this.isDealerPlaying = true;

        // DOM elements
        this.playerCardsEl = document.getElementById('playerCards');
        this.dealerCardsEl = document.getElementById('dealerCards');
        this.playerScoreEl = document.getElementById('playerScore');
        this.dealerScoreEl = document.getElementById('dealerScore');
        this.cardCountEl = document.getElementById('cardCount');
        this.hitButton = document.getElementById('hitButton');
        this.standButton = document.getElementById('standButton');
        this.resetButton = document.getElementById('resetButton');
        this.gameModal = document.getElementById('gameModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalIcon = document.getElementById('modalIcon');
        this.modalButton = document.getElementById('modalButton');

        this.setupEventListeners();
        this.updateDisplay();
        this.setButtonsEnabled(false);

        if (this.autoStart) {
            this.dealInitialCards();
        }
    }

    setupEventListeners() {
        this.hitButton.addEventListener('click', () => this.playerHit());
        this.standButton.addEventListener('click', () => this.playerStand());
        this.resetButton.addEventListener('click', () => this.resetGame());
        this.modalButton.addEventListener('click', () => this.closeModal());
    }

    /**
     * Start a fresh game (from title screen)
     */
    startGame() {
        this.resetHands({ reshuffle: true });
        this.dealInitialCards();
    }

    /**
     * Deal initial cards (2 to each player)
     */
    async dealInitialCards() {
        this.gameState = 'DEALING';
        this.setButtonsEnabled(false);

        // Deal sequence: Player, Dealer, Player, Dealer
        await this.dealCardToPlayer();
        await this.delay(400);

        await this.dealCardToDealer();
        await this.delay(400);

        await this.dealCardToPlayer();
        await this.delay(400);

        await this.dealCardToDealer();
        await this.delay(400);

        // Check for blackjack
        if (this.playerScore === 21 || this.dealerScore === 21) {
            this.gameState = 'GAME_OVER';
            this.checkWinner();
        } else {
            this.gameState = 'PLAYER_TURN';
            this.setButtonsEnabled(true);
        }
    }

    /**
     * Deal a card to player
     */
    async dealCardToPlayer() {
        const card = this.deck.drawCard();
        this.playerCards.push(card);

        await cardRenderer.animateCardDeal(
            card,
            this.playerCardsEl,
            this.playerCards.length - 1,
            this.playerCards.length,
            false // n-form fan
        );

        this.playerScore = this.calculateScore(this.playerCards);
        this.updateDisplay();
    }

    /**
     * Deal a card to dealer
     */
    async dealCardToDealer() {
        const card = this.deck.drawCard();
        this.dealerCards.push(card);

        await cardRenderer.animateCardDeal(
            card,
            this.dealerCardsEl,
            this.dealerCards.length - 1,
            this.dealerCards.length,
            true // u-form fan
        );

        this.dealerScore = this.calculateScore(this.dealerCards);
        this.updateDisplay();
    }

    /**
     * Player hits (draws a card)
     */
    async playerHit() {
        if (this.gameState !== 'PLAYER_TURN') return;

        this.setButtonsEnabled(false);
        await this.dealCardToPlayer();

        if (this.playerScore > 21) {
            this.gameState = 'GAME_OVER';
            this.isPlayerPlaying = false;
            this.showResult('BUST', 'You busted!', '💥');
        } else {
            this.setButtonsEnabled(true);
        }
    }

    /**
     * Player stands (ends turn)
     */
    async playerStand() {
        if (this.gameState !== 'PLAYER_TURN') return;

        this.gameState = 'DEALER_TURN';
        this.isPlayerPlaying = false;
        this.setButtonsEnabled(false);

        // Dealer draws until reaching 16+
        await this.delay(500);
        await this.dealerPlay();
    }

    /**
     * Dealer's automatic play
     */
    async dealerPlay() {
        while (this.dealerScore < 16) {
            await this.delay(800);
            await this.dealCardToDealer();
        }

        this.isDealerPlaying = false;
        this.gameState = 'GAME_OVER';

        await this.delay(500);
        this.checkWinner();
    }

    /**
     * Calculate score for a hand (with ace adjustment)
     */
    calculateScore(cards) {
        let score = 0;
        let aceCount = 0;

        for (let card of cards) {
            score += card.value;
            if (card.value === 11) aceCount++;
        }

        // Adjust aces from 11 to 1 if needed
        while (score > 21 && aceCount > 0) {
            score -= 10;
            aceCount--;
        }

        return score;
    }

    /**
     * Check winner and show result
     */
    checkWinner() {
        if (this.playerScore > 21) {
            this.showResult('LOSE', `You busted with ${this.playerScore}!`, '💥');
        } else if (this.dealerScore > 21) {
            this.showResult('WIN', `Dealer busted with ${this.dealerScore}!`, '🎉');
        } else if (this.playerScore > this.dealerScore) {
            this.showResult('WIN', `You win ${this.playerScore} to ${this.dealerScore}!`, '🎉');
        } else if (this.dealerScore > this.playerScore) {
            this.showResult('LOSE', `Dealer wins ${this.dealerScore} to ${this.playerScore}`, '😞');
        } else {
            this.showResult('PUSH', `Push! Both have ${this.playerScore}`, '🤝');
        }
    }

    /**
     * Show result modal
     */
    showResult(result, message, icon) {
        this.modalIcon.textContent = icon;

        if (result === 'WIN') {
            this.modalTitle.textContent = 'You Win!';
            this.modalTitle.style.color = '#7dd3c0';
        } else if (result === 'LOSE' || result === 'BUST') {
            this.modalTitle.textContent = 'You Lose';
            this.modalTitle.style.color = '#e74c3c';
        } else {
            this.modalTitle.textContent = 'Push';
            this.modalTitle.style.color = '#f39c12';
        }

        this.modalMessage.textContent = message;
        this.gameModal.classList.add('show');
    }

    /**
     * Close modal
     */
    closeModal() {
        this.gameModal.classList.remove('show');
    }

    /**
     * Reset game
     */
    async resetGame() {
        this.closeModal();
        this.resetHands({ reshuffle: this.deck.remainingCards() < 20 });

        // Deal new hand
        await this.delay(300);
        this.dealInitialCards();
    }

    /**
     * Reset hand state and optionally reshuffle
     */
    resetHands({ reshuffle = false } = {}) {
        this.playerCards = [];
        this.dealerCards = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.isPlayerPlaying = true;
        this.isDealerPlaying = true;

        // Clear display
        this.playerCardsEl.innerHTML = '';
        this.dealerCardsEl.innerHTML = '';

        if (reshuffle) {
            this.deck.reset();
        }

        this.updateDisplay();
    }

    /**
     * Update score and card count display
     */
    updateDisplay() {
        this.playerScoreEl.textContent = this.playerScore;
        this.dealerScoreEl.textContent = this.dealerScore;
        this.cardCountEl.textContent = `${this.deck.remainingCards()} cards`;
    }

    /**
     * Enable/disable buttons
     */
    setButtonsEnabled(enabled) {
        this.hitButton.disabled = !enabled;
        this.standButton.disabled = !enabled;
    }

    /**
     * Utility: delay/sleep
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new BlackJackGame({ autoStart: false });
    const lobbyClient = new LobbyClient({ url: 'ws://localhost:8080' });
    let currentLobbyCode = null;

    const titleScreen = document.getElementById('titleScreen');
    const lobbyScreen = document.getElementById('lobbyScreen');
    const creatingLobbyScreen = document.getElementById('creatingLobbyScreen');
    const lobbyRoomScreen = document.getElementById('lobbyRoomScreen');
    const singleBtn = document.getElementById('singleplayerButton');
    const multiBtn = document.getElementById('multiplayerButton');
    const createLobbyButton = document.getElementById('createLobbyButton');
    const joinLobbyButton = document.getElementById('joinLobbyButton');
    const joinForm = document.getElementById('joinForm');
    const joinCodeInputs = joinForm ? Array.from(joinForm.querySelectorAll('.join-input')) : [];
    const connectLobbyButton = document.getElementById('connectLobbyButton');
    const lobbyCodeEl = document.getElementById('lobbyCode');
    const copyLobbyCodeBtn = document.getElementById('copyLobbyCode');
    const userListEl = document.getElementById('userList');
    const chatWindowEl = document.getElementById('chatWindow');
    const chatInputEl = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChat');

    const hideOverlay = (el) => el && el.classList.add('hidden');
    const showOverlay = (el) => el && el.classList.remove('hidden');
    const resetChat = () => {
        if (chatWindowEl) chatWindowEl.innerHTML = '';
    };

    const startPlay = () => {
        hideOverlay(titleScreen);
        hideOverlay(lobbyScreen);
        game.startGame();
    };

    const openMultiplayerLobby = () => {
        hideOverlay(titleScreen);
        showOverlay(lobbyScreen);
    };

    const renderUsers = (users) => {
        if (!userListEl) return;
        userListEl.innerHTML = '';
        users.forEach((user) => {
            const li = document.createElement('li');

            const avatar = document.createElement('div');
            avatar.className = 'user-avatar';
            avatar.textContent = user.name.slice(0, 1).toUpperCase();

            const name = document.createElement('div');
            name.className = 'user-name';
            name.textContent = user.name;

            li.appendChild(avatar);
            li.appendChild(name);

            const tag = document.createElement('div');
            tag.className = 'user-tag';
            tag.textContent = user.role === 'host' ? 'Host' : 'Guest';
            li.appendChild(tag);

            userListEl.appendChild(li);
        });
    };

    const appendChatMessage = (author, text) => {
        if (!chatWindowEl) return;
        const row = document.createElement('div');
        row.className = 'chat-message';

        const authorEl = document.createElement('div');
        authorEl.className = 'chat-author';
        authorEl.textContent = `${author}:`;

        const textEl = document.createElement('div');
        textEl.className = 'chat-text';
        textEl.textContent = text;

        row.appendChild(authorEl);
        row.appendChild(textEl);
        chatWindowEl.appendChild(row);
        chatWindowEl.scrollTop = chatWindowEl.scrollHeight;
    };

    const showLobbyRoom = ({ code, players, notice }) => {
        hideOverlay(creatingLobbyScreen);
        hideOverlay(lobbyScreen);
        currentLobbyCode = code;
        if (lobbyCodeEl) lobbyCodeEl.textContent = code;
        renderUsers(players || []);
        resetChat();
        if (notice) appendChatMessage('System', notice);
        showOverlay(lobbyRoomScreen);
    };

    const setLoadingMessage = (message) => {
        const loadingMessageEl = document.getElementById('loadingMessage');
        if (loadingMessageEl) {
            loadingMessageEl.textContent = message;
        }
    };

    const readJoinCode = () => joinCodeInputs.map((inp) => inp.value.trim()).join('');

    const setJoinConnectEnabled = () => {
        if (!connectLobbyButton) return;
        const code = readJoinCode();
        connectLobbyButton.disabled = code.length !== 6 || /\D/.test(code);
    };

    const focusNextInput = (index) => {
        const next = joinCodeInputs[index + 1];
        if (next) next.focus();
    };

    const focusPrevInput = (index) => {
        const prev = joinCodeInputs[index - 1];
        if (prev) prev.focus();
    };

    const resetJoinInputs = () => {
        joinCodeInputs.forEach((inp) => {
            inp.value = '';
        });
        if (joinCodeInputs[0]) joinCodeInputs[0].focus();
        setJoinConnectEnabled();
    };

    const handleError = (message) => {
        alert(message || 'Something went wrong.');
        hideOverlay(creatingLobbyScreen);
        showOverlay(lobbyScreen);
    };

    const startCreatingLobby = async () => {
        hideOverlay(lobbyScreen);
        setLoadingMessage('Creating lobby ...');
        showOverlay(creatingLobbyScreen);
        try {
            await lobbyClient.ensureConnection();
            lobbyClient.createLobby();
        } catch (err) {
            handleError('Failed to reach server.');
        }
    };

    const startJoiningLobby = async () => {
        const code = readJoinCode();
        if (code.length !== 6 || /\D/.test(code)) return;
        hideOverlay(lobbyScreen);
        setLoadingMessage('Joining lobby ...');
        showOverlay(creatingLobbyScreen);

        try {
            await lobbyClient.ensureConnection();
            lobbyClient.joinLobby(code);
        } catch (err) {
            handleError('Failed to reach server.');
        }
    };

    if (singleBtn) {
        singleBtn.addEventListener('click', () => startPlay());
    }

    if (multiBtn) {
        multiBtn.addEventListener('click', () => openMultiplayerLobby());
    }

    if (createLobbyButton) {
        createLobbyButton.addEventListener('click', () => {
            startCreatingLobby();
        });
    }

    if (joinLobbyButton) {
        joinLobbyButton.addEventListener('click', () => {
            if (joinForm) {
                joinForm.classList.toggle('hidden');
                if (!joinForm.classList.contains('hidden') && joinCodeInputs[0]) {
                    joinCodeInputs[0].focus();
                }
            }
        });
    }

    if (copyLobbyCodeBtn) {
        copyLobbyCodeBtn.addEventListener('click', async () => {
            if (!lobbyCodeEl) return;
            try {
                await navigator.clipboard.writeText(lobbyCodeEl.textContent);
                const label = copyLobbyCodeBtn.querySelector('.button-text');
                if (label) label.textContent = 'Copied!';
                setTimeout(() => {
                    if (label) label.textContent = 'Copy';
                }, 1200);
            } catch (err) {
                console.warn('Clipboard copy failed', err);
            }
        });
    }

    const sendChat = () => {
        if (!chatInputEl) return;
        const text = chatInputEl.value.trim();
        if (!text) return;
        lobbyClient.chat(text);
        chatInputEl.value = '';
    };

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChat);
    }

    if (chatInputEl) {
        chatInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendChat();
            }
        });
    }

    if (connectLobbyButton) {
        connectLobbyButton.addEventListener('click', startJoiningLobby);
    }

    joinCodeInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 1);
            e.target.value = value;
            if (value && index < joinCodeInputs.length - 1) {
                const next = joinCodeInputs[index + 1];
                if (next) next.focus();
            }
            setJoinConnectEnabled();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value) {
                const prev = joinCodeInputs[index - 1];
                if (prev) prev.focus();
                e.preventDefault();
            }
        });
    });

    lobbyClient.on('lobby_created', ({ code, players }) => {
        showLobbyRoom({ code, players, notice: 'Lobby created. Share the code to invite a friend.' });
    });

    lobbyClient.on('lobby_joined', ({ code, players }) => {
        showLobbyRoom({ code, players, notice: 'Joined lobby. Say hi!' });
    });

    lobbyClient.on('lobby_update', ({ players }) => {
        renderUsers(players || []);
    });

    lobbyClient.on('chat_message', ({ from, text }) => {
        appendChatMessage(from || 'Player', text);
    });

    lobbyClient.on('game_start', () => {
        appendChatMessage('System', 'Game is starting...');
    });

    lobbyClient.on('error', ({ message }) => {
        handleError(message);
    });
});

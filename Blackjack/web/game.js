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
        this.rematchStatus = document.getElementById('rematchStatus');
        this.rematchReadyDot = document.getElementById('rematchReadyDot');
        this.rematchReadyText = document.getElementById('rematchReadyText');
        this.manualDealerMode = false;
        this.controlledSide = 'player'; // 'player' -> bottom view, 'dealer' -> top view
        this.networkRole = 'local'; // 'local' | 'host' | 'guest'

        this.setupEventListeners();
        this.updateDisplay();
        this.setButtonsEnabled(false);

        if (this.autoStart) {
            this.dealInitialCards();
        }
    }

    resolveHandContext(forDealerHand = false) {
        const playerIsBottom = this.controlledSide !== 'dealer';
        const playerContainer = playerIsBottom ? this.playerCardsEl : this.dealerCardsEl;
        const dealerContainer = playerIsBottom ? this.dealerCardsEl : this.playerCardsEl;
        const container = forDealerHand ? dealerContainer : playerContainer;
        const isDealerFan = playerIsBottom ? forDealerHand : !forDealerHand;
        return { container, isDealerFan };
    }

    setupEventListeners() {
        this.hitButton.addEventListener('click', () => this.playerHit());
        this.standButton.addEventListener('click', () => this.playerStand());
        this.resetButton.addEventListener('click', () => this.resetGame());
        this.modalButton.addEventListener('click', () => this.handleModalAction());
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
        const { container, isDealerFan } = this.resolveHandContext(false);

        await cardRenderer.animateCardDeal(
            card,
            container,
            this.playerCards.length - 1,
            this.playerCards.length,
            isDealerFan // fan style based on perspective
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
        const { container, isDealerFan } = this.resolveHandContext(true);

        await cardRenderer.animateCardDeal(
            card,
            container,
            this.dealerCards.length - 1,
            this.dealerCards.length,
            isDealerFan // fan style based on perspective
        );

        this.dealerScore = this.calculateScore(this.dealerCards);
        this.updateDisplay();
    }

    /**
     * Player hits (draws a card)
     */
    async playerHit() {
        if (this.networkRole === 'guest') return;
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
        if (this.networkRole === 'guest') return;
        if (this.gameState !== 'PLAYER_TURN') return;

        this.gameState = 'DEALER_TURN';
        this.isPlayerPlaying = false;
        this.setButtonsEnabled(false);

        if (this.manualDealerMode) {
            // Wait for manual dealer actions (remote)
            return;
        }

        // Dealer draws until reaching 16+ (solo mode)
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
     * Manual dealer control: hit
     */
    async dealerHitManual() {
        if (!this.manualDealerMode) return;
        if (this.gameState !== 'DEALER_TURN') return;
        await this.dealCardToDealer();
        if (this.dealerScore > 21) {
            this.isDealerPlaying = false;
            this.gameState = 'GAME_OVER';
            await this.delay(500);
            this.checkWinner();
        }
    }

    /**
     * Manual dealer control: stand / finish
     */
    async dealerStandManual() {
        if (!this.manualDealerMode) return;
        if (this.gameState !== 'DEALER_TURN') return;
        this.isDealerPlaying = false;
        this.gameState = 'GAME_OVER';
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
        if (typeof window.handleRoundEnd === 'function') {
            window.handleRoundEnd();
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        this.gameModal.classList.remove('show');
    }

    handleModalAction() {
        if (this.networkRole === 'local') {
            this.closeModal();
            return;
        }
        // Guest toggles readiness; Host starts new round if guest ready
        if (this.networkRole === 'guest') {
            if (typeof window.updateGuestRematchReady === 'function') {
                window.updateGuestRematchReady();
            }
            return;
        }
        // Host
        if (typeof window.hostTryRematch === 'function') {
            window.hostTryRematch();
        }
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
        const bottomIsPlayer = this.controlledSide !== 'dealer';
        const bottomScore = bottomIsPlayer ? this.playerScore : this.dealerScore;
        const topScore = bottomIsPlayer ? this.dealerScore : this.playerScore;
        this.playerScoreEl.textContent = bottomScore;
        this.dealerScoreEl.textContent = topScore;
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

    /**
     * Re-render both hands instantly (no animation)
     */
    renderHandsInstant() {
        const playerCtx = this.resolveHandContext(false);
        const dealerCtx = this.resolveHandContext(true);
        cardRenderer.renderHand(playerCtx.container, this.playerCards, playerCtx.isDealerFan);
        cardRenderer.renderHand(dealerCtx.container, this.dealerCards, dealerCtx.isDealerFan);
    }

    /**
     * Apply remote state snapshot (guest view)
     */
    applyExternalState(snapshot = {}) {
        this.playerCards = snapshot.playerCards ? [...snapshot.playerCards] : [];
        this.dealerCards = snapshot.dealerCards ? [...snapshot.dealerCards] : [];
        this.playerScore = snapshot.playerScore ?? this.calculateScore(this.playerCards);
        this.dealerScore = snapshot.dealerScore ?? this.calculateScore(this.dealerCards);
        this.gameState = snapshot.gameState || 'INITIAL';
        this.renderHandsInstant();
        this.updateDisplay();
        if (typeof snapshot.deckRemaining === 'number' && this.cardCountEl) {
            this.cardCountEl.textContent = `${snapshot.deckRemaining} cards`;
        }
        if (snapshot.gameState === 'GAME_OVER') {
            this.gameState = 'GAME_OVER';
        }

        if (snapshot.outcome) {
            this.showExternalResult(snapshot.outcome);
        } else if (snapshot.result) {
            this.showExternalResult(snapshot.result);
        } else {
            this.closeModal();
        }
    }

    /**
     * Show result coming from remote host
     */
    showExternalResult({ title, message, icon }) {
        this.modalIcon.textContent = icon || '🎴';
        this.modalTitle.textContent = title || 'Game Result';
        this.modalTitle.style.color = '#7dd3c0';
        this.modalMessage.textContent = message || '';
        this.gameModal.classList.add('show');
        if (typeof window.handleRoundEnd === 'function') {
            window.handleRoundEnd();
        }
    }

    setManualDealerMode(enabled) {
        this.manualDealerMode = !!enabled;
    }

    setNetworkRole(role = 'local') {
        this.networkRole = role;
    }

    setControlledSide(side = 'player') {
        const normalized = side === 'dealer' ? 'dealer' : 'player';
        const changed = this.controlledSide !== normalized;
        this.controlledSide = normalized;
        if (changed) {
            this.renderHandsInstant();
        }
        this.updateDisplay();
    }
}

// Start game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new BlackJackGame({ autoStart: false });
    const lobbyUrl =
        window.location.protocol === 'file:'
            ? 'ws://localhost:8080'
            : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const lobbyClient =
        typeof PeerLobbyClient !== 'undefined'
            ? new PeerLobbyClient({})
            : new LobbyClient({ url: lobbyUrl });
    const readySupported = typeof lobbyClient.setReady === 'function';
    const gameSyncSupported = typeof lobbyClient.sendGameState === 'function';
    let currentLobbyCode = null;
    let myRole = null; // 'host' | 'guest'
    let myReady = false;
    let guestReady = false;
    let guestPresent = false;
    let lobbyGameStarted = false;
    let currentTurn = 'player'; // 'player' | 'dealer'
    let hostName = 'Host';
    let guestName = 'Dealer';
    let playerDisplayName = lobbyClient.playerName || 'Player';
    const MAX_LIVES = 3;
    let hostLives = MAX_LIVES;
    let guestLives = MAX_LIVES;
    let playerSide = 'host'; // which role controls the "player" hand this round
    let nextPlayerSide = 'host';
    let roundOutcomeApplied = false;
    let matchWinner = null;
    game.setNetworkRole('local');
    game.setManualDealerMode(false);

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
    const pasteLobbyCodeButton = document.getElementById('pasteLobbyCodeButton');
    const lobbyCodeEl = document.getElementById('lobbyCode');
    const copyLobbyCodeBtn = document.getElementById('copyLobbyCode');
    const userListEl = document.getElementById('userList');
    const chatWindowEl = document.getElementById('chatWindow');
    const chatInputEl = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChat');
    const guestReadyButton = document.getElementById('guestReadyButton');
    const hostStartButton = document.getElementById('hostStartButton');
    const modalContentEl = document.querySelector('#gameModal .modal-content');
    const deckContainerEl = document.getElementById('deckContainer');
    const dealerLabelEl = document.querySelector('.dealer-score .score-label');
    const playerLabelEl = document.querySelector('.player-score .score-label');
    const dealerLivesRow = document.getElementById('dealerLives');
    const playerLivesRow = document.getElementById('playerLives');
    const backConfirmOverlay = document.getElementById('backConfirmOverlay');
    const backConfirmStay = document.getElementById('backConfirmStay');
    const backConfirmExit = document.getElementById('backConfirmExit');
    const backConfirmTitle = document.querySelector('#backConfirmOverlay .confirm-title');
    const backConfirmText = document.querySelector('#backConfirmOverlay .confirm-text');
    const backConfirmExitLabel = backConfirmExit ? backConfirmExit.querySelector('.button-text') : null;
    const backConfirmStayLabel = backConfirmStay ? backConfirmStay.querySelector('.button-text') : null;
    const errorOverlay = document.getElementById('errorOverlay');
    const errorTitleEl = document.getElementById('errorTitle');
    const errorMessageEl = document.getElementById('errorMessage');
    const errorOkButton = document.getElementById('errorOkButton');
    const errorRetryButton = document.getElementById('errorRetryButton');
    const profileButton = document.getElementById('profileButton');
    const profilePopover = document.getElementById('profilePopover');
    const profileNameInput = document.getElementById('profileNameInput');
    const profileSaveButton = document.getElementById('profileSaveButton');
    const profileCloseButton = document.getElementById('profileCloseButton');
    const profileNameChip = document.getElementById('profileNameChip');
    const profileShell = document.getElementById('profileShell');

    const PLAYER_NAME_KEY = 'bj_player_name';
    const MAX_NAME_LENGTH = 24;

    let lastOverlayBeforeGame = titleScreen;
    let lastRetryAction = null;
    let backConfirmAction = null;

    const sanitizePlayerName = (value) => {
        if (!value) return '';
        return value.toString().replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
    };

    const randomPlayerName = () => `Player-${Math.random().toString(36).slice(2, 6)}`;

    const pushPlayerNameToClient = (name) => {
        const safeName = sanitizePlayerName(name) || randomPlayerName();
        if (typeof lobbyClient.setPlayerName === 'function') {
            lobbyClient.setPlayerName(safeName);
        } else {
            lobbyClient.playerName = safeName;
        }
        try {
            localStorage.setItem(PLAYER_NAME_KEY, safeName);
        } catch (_) {
            /* ignore storage issues */
        }
        playerDisplayName = safeName;
        if (profileNameChip) {
            profileNameChip.textContent = safeName;
            profileNameChip.title = safeName;
        }
        if (profileNameInput && document.activeElement !== profileNameInput) {
            profileNameInput.value = safeName;
        }
        return safeName;
    };

    const storedPlayerName = (() => {
        try {
            return localStorage.getItem(PLAYER_NAME_KEY);
        } catch (_) {
            return '';
        }
    })();

    playerDisplayName = pushPlayerNameToClient(
        sanitizePlayerName(storedPlayerName) || sanitizePlayerName(playerDisplayName) || randomPlayerName()
    );

    const isOverlayVisible = (el) => el && !el.classList.contains('hidden');
    const syncOverlayState = () => {
        const hasOverlay =
            isOverlayVisible(titleScreen) ||
            isOverlayVisible(lobbyScreen) ||
            isOverlayVisible(creatingLobbyScreen) ||
            isOverlayVisible(lobbyRoomScreen) ||
            isOverlayVisible(backConfirmOverlay) ||
            isOverlayVisible(errorOverlay);
        document.body.classList.toggle('overlay-open', hasOverlay);
        updateProfileVisibility();
    };
    const hideOverlay = (el) => {
        if (!el) return;
        el.classList.add('hidden');
        syncOverlayState();
    };
    const showOverlay = (el) => {
        if (!el) return;
        el.classList.remove('hidden');
        syncOverlayState();
    };
    const swapOverlay = (from, to) => {
        if (to) showOverlay(to);
        requestAnimationFrame(() => {
            if (from) hideOverlay(from);
        });
    };
    const isBackConfirmVisible = () => backConfirmOverlay && !backConfirmOverlay.classList.contains('hidden');
    const setBackConfirmContent = ({
        title = 'Leave current game?',
        message = 'Your current hand will be abandoned. Return to the previous screen?',
        exitLabel = 'Exit',
        stayLabel = 'Stay',
    } = {}) => {
        if (backConfirmTitle) backConfirmTitle.textContent = title;
        if (backConfirmText) backConfirmText.textContent = message;
        if (backConfirmExitLabel) backConfirmExitLabel.textContent = exitLabel;
        if (backConfirmStayLabel) backConfirmStayLabel.textContent = stayLabel;
    };

    const showBackConfirm = (options = {}, onExit) => {
        setBackConfirmContent(options);
        backConfirmAction = onExit || null;
        if (!backConfirmOverlay) return;
        backConfirmOverlay.classList.remove('hidden');
        syncOverlayState();
    };
    const hideBackConfirm = () => {
        backConfirmAction = null;
        if (!backConfirmOverlay) return;
        backConfirmOverlay.classList.add('hidden');
        syncOverlayState();
    };

    const resetProfileForm = () => {
        if (!profileNameInput) return;
        profileNameInput.value = playerDisplayName;
        try {
            profileNameInput.setSelectionRange(0, playerDisplayName.length);
        } catch (_) {
            /* noop */
        }
    };

    const closeProfilePopover = () => {
        if (!profilePopover) return;
        profilePopover.classList.add('hidden');
        resetProfileForm();
    };

    const openProfilePopover = () => {
        if (!profilePopover) return;
        profilePopover.classList.remove('hidden');
        resetProfileForm();
        if (profileNameInput) {
            profileNameInput.focus();
        }
    };

    const acceptProfileName = () => pushPlayerNameToClient(profileNameInput ? profileNameInput.value : playerDisplayName);
    const updateProfileVisibility = () => {
        const onTitle = isOverlayVisible(titleScreen);
        if (profileShell) {
            profileShell.style.display = onTitle ? '' : 'none';
        }
    };

    const isInGameplayView = () =>
        !isOverlayVisible(titleScreen) &&
        !isOverlayVisible(lobbyScreen) &&
        !isOverlayVisible(creatingLobbyScreen) &&
        !isOverlayVisible(lobbyRoomScreen);
    const resetChat = () => {
        if (chatWindowEl) chatWindowEl.innerHTML = '';
    };
    const updateRoleControlsVisibility = () => {
        if (guestReadyButton) {
            guestReadyButton.classList.toggle('control-hidden', myRole !== 'guest');
        }
        if (hostStartButton) {
            hostStartButton.classList.toggle('control-hidden', myRole !== 'host');
        }
    };

    const syncHostStartState = () => {
        if (!hostStartButton) return;
        const label = hostStartButton.querySelector('.button-text') || hostStartButton;
        const enabled = !lobbyGameStarted && guestPresent && (readySupported ? guestReady : true);
        hostStartButton.disabled = !enabled;
        hostStartButton.classList.toggle('start-locked', !enabled);
        label.textContent = lobbyGameStarted
            ? 'Game Started'
            : enabled
                ? 'Start Game'
                : 'Start Game (Waiting)';
    };

    const syncGuestReadyButton = () => {
        if (!guestReadyButton) return;
        const label = guestReadyButton.querySelector('.button-text') || guestReadyButton;
        guestReadyButton.classList.toggle('ready-toggle', true);
        guestReadyButton.classList.toggle('ready', myReady);
        guestReadyButton.disabled = lobbyGameStarted;
        label.textContent = lobbyGameStarted ? 'In Game' : myReady ? 'Ready ✔' : 'Ready?';
    };

    const syncNameLabels = () => {
        if (!dealerLabelEl || !playerLabelEl) return;
        const youLabel = playerDisplayName || 'You';
        const playerSideLabel = playerSide === 'host' ? hostName || 'Host' : guestName || 'Guest';
        const dealerSideLabel = playerSide === 'host' ? guestName || 'Guest' : hostName || 'Host';
        const bottomIsPlayerSide = viewerControlledSide() === 'player';
        let bottomLabel = bottomIsPlayerSide ? playerSideLabel : dealerSideLabel;
        let topLabel = bottomIsPlayerSide ? dealerSideLabel : playerSideLabel;

        if (isPvpSession()) {
            const viewerControlsBottom = viewerControlledSide() === (bottomIsPlayerSide ? 'player' : 'dealer');
            const viewerControlsTop = viewerControlledSide() === (bottomIsPlayerSide ? 'dealer' : 'player');
            if (viewerControlsBottom) bottomLabel = youLabel;
            if (viewerControlsTop) topLabel = youLabel;
        } else {
            bottomLabel = youLabel;
        }

        playerLabelEl.textContent = bottomLabel;
        dealerLabelEl.textContent = topLabel;
    };

    const isPvpSession = () => !!currentLobbyCode && gameSyncSupported;
    const isHostTurn = () => game.gameState === "PLAYER_TURN";
    const isDealerTurn = () => game.gameState === "DEALER_TURN";
    const dealerRole = () => (playerSide === 'host' ? 'guest' : 'host');
    const viewerControlsPlayer = () => isPvpSession() && myRole === playerSide;
    const viewerControlledSide = () => (!isPvpSession() ? 'player' : viewerControlsPlayer() ? 'player' : 'dealer');
    const resetMatchState = () => {
        hostLives = MAX_LIVES;
        guestLives = MAX_LIVES;
        playerSide = 'host';
        nextPlayerSide = 'host';
        roundOutcomeApplied = false;
        matchWinner = null;
    };

    const updateControlledSide = () => {
        const side = isPvpSession() ? viewerControlledSide() : 'player';
        game.setControlledSide(side);
    };

    const setLivesRow = (rowEl, lives) => {
        if (!rowEl) return;
        const icons = Array.from(rowEl.querySelectorAll('.life-icon'));
        icons.forEach((icon, idx) => {
            icon.classList.toggle('lost', idx >= lives);
        });
    };

    const renderLives = () => {
        const playerLivesCount = playerSide === 'host' ? hostLives : guestLives;
        const dealerLivesCount = playerSide === 'host' ? guestLives : hostLives;
        setLivesRow(playerLivesRow, playerLivesCount);
        setLivesRow(dealerLivesRow, dealerLivesCount);
    };

    const roleDisplayName = (role) => {
        if (role === 'host') return hostName || 'Host';
        if (role === 'guest') return guestName || 'Guest';
        return 'Player';
    };

    const computeOutcome = () => {
        if (game.gameState !== "GAME_OVER") return null;
        if (game.playerScore > 21) {
            return {
                winner: "dealer",
                reason: "player_bust",
                playerScore: game.playerScore,
                dealerScore: game.dealerScore,
            };
        }
        if (game.dealerScore > 21) {
            return {
                winner: "player",
                reason: "dealer_bust",
                playerScore: game.playerScore,
                dealerScore: game.dealerScore,
            };
        }
        if (game.playerScore > game.dealerScore) {
            return {
                winner: "player",
                reason: "score",
                playerScore: game.playerScore,
                dealerScore: game.dealerScore,
            };
        }
        if (game.dealerScore > game.playerScore) {
            return {
                winner: "dealer",
                reason: "score",
                playerScore: game.playerScore,
                dealerScore: game.dealerScore,
            };
        }
        return {
            winner: "push",
            reason: "push",
            playerScore: game.playerScore,
            dealerScore: game.dealerScore,
        };
    };

    const buildGameSnapshot = () => {
        const result = computeOutcome();
        return {
            playerCards: game.playerCards.map((c) => ({ ...c })),
            dealerCards: game.dealerCards.map((c) => ({ ...c })),
            playerScore: game.playerScore,
            dealerScore: game.dealerScore,
            gameState: game.gameState,
            turn: isHostTurn() ? 'player' : isDealerTurn() ? 'dealer' : 'none',
            deckRemaining: game.deck.remainingCards(),
            outcome: result,
            playerSide,
            hostLives,
            guestLives,
            matchWinner,
        };
    };

    const sendGameStateToGuest = () => {
        if (!isPvpSession() || myRole !== 'host') return;
        const snapshot = buildGameSnapshot();
        lobbyClient.sendGameState(snapshot);
    };

    const syncActionButtons = () => {
        if (!isPvpSession()) return;
        const iAmPlayer = playerSide === myRole;
        const canActPlayer = lobbyGameStarted && iAmPlayer && game.gameState === 'PLAYER_TURN' && game.gameState !== 'GAME_OVER' && !matchWinner;
        const canActDealer =
            lobbyGameStarted &&
            !iAmPlayer &&
            game.manualDealerMode &&
            game.gameState === 'DEALER_TURN' &&
            game.gameState !== 'GAME_OVER' &&
            !matchWinner;
        const enable = canActPlayer || canActDealer;
        if (myRole === 'host') {
            game.setButtonsEnabled(enable);
        } else if (myRole === 'guest') {
            game.hitButton.disabled = !enable;
            game.standButton.disabled = !enable;
        }
    };

    const applyRemoteSnapshot = (snapshot) => {
        lobbyGameStarted = true;
        currentTurn = snapshot.turn || 'player';
        playerSide = snapshot.playerSide || playerSide;
        hostLives = typeof snapshot.hostLives === 'number' ? snapshot.hostLives : hostLives;
        guestLives = typeof snapshot.guestLives === 'number' ? snapshot.guestLives : guestLives;
        matchWinner = snapshot.matchWinner !== undefined ? snapshot.matchWinner : matchWinner;
        if (myRole === 'guest') {
            game.setNetworkRole('guest');
            if (!isInGameplayView()) {
                startPlay({ autoDeal: false });
            }
        }
        updateControlledSide();
        renderLives();
        game.applyExternalState(snapshot);
        syncHostStartState();
        syncGuestReadyButton();
        syncNameLabels();
        syncActionButtons();
        updateRematchStatus();
    };

    const originalPlayerHit = game.playerHit.bind(game);
    const originalPlayerStand = game.playerStand.bind(game);
    let postRoundReady = false;

    const sendDealerActionToHost = (action) => {
        if (isPvpSession() && myRole === 'guest' && typeof lobbyClient.sendDealerAction === 'function') {
            lobbyClient.sendDealerAction(action);
        }
    };

    const sendPlayerActionToHost = (action) => {
        if (isPvpSession() && myRole === 'guest' && typeof lobbyClient.sendPlayerAction === 'function') {
            lobbyClient.sendPlayerAction(action);
        }
    };

    const updateRematchStatus = () => {
        if (!game.rematchStatus || !game.rematchReadyDot || !game.rematchReadyText) return;
        const show = isPvpSession() && game.gameState === "GAME_OVER";
        game.rematchStatus.style.display = show ? "flex" : "none";
        const dotReady = myRole === "host" ? guestReady : myReady;
        game.rematchReadyDot.classList.toggle("ready", dotReady);
        game.rematchReadyDot.classList.toggle("not-ready", !dotReady);
        const guestLabel = guestName || "Guest";
        game.rematchReadyText.textContent =
            myRole === "host"
                ? dotReady
                    ? `${guestLabel} is Ready`
                    : `Waiting for ${guestLabel}`
                : myReady
                    ? "You are Ready"
                    : "Tap Ready to Play Again";
        if (game.modalButton) {
            if (myRole === "host") {
                game.modalButton.disabled = !dotReady;
                game.modalButton.textContent = "Play Again";
            } else if (myRole === "guest") {
                game.modalButton.disabled = false;
                game.modalButton.textContent = "Ready";
            }
        }
    };

    const applyOutcomeToLives = (outcome = {}) => {
        if (!isPvpSession() || myRole !== 'host') return;
        if (roundOutcomeApplied) return;
        roundOutcomeApplied = true;
        if (!outcome || outcome.winner === "push") {
            renderLives();
            return;
        }
        const losingRole = outcome.winner === "player" ? dealerRole() : playerSide;
        if (losingRole === 'host') {
            hostLives = Math.max(0, hostLives - 1);
        } else if (losingRole === 'guest') {
            guestLives = Math.max(0, guestLives - 1);
        }
        if (hostLives === 0 || guestLives === 0) {
            matchWinner = hostLives > guestLives ? 'host' : 'guest';
        }
        renderLives();
    };

    const renderOutcomeModal = (outcome = {}) => {
        const inPvp = isPvpSession();
        const viewerRole = inPvp ? myRole : null;
        const playerRole = inPvp ? playerSide : null;
        const dealerRoleForRound = inPvp ? dealerRole() : null;
        const winnerRole =
            outcome.winner === "push"
                ? null
                : outcome.winner === "player"
                    ? playerRole
                    : dealerRoleForRound;
        const viewerWins = inPvp
            ? winnerRole === viewerRole
            : outcome.winner === "player";
        const viewerScore = inPvp
            ? viewerRole === playerRole
                ? outcome.playerScore
                : outcome.dealerScore
            : outcome.playerScore;
        const opponentScore = inPvp
            ? viewerRole === playerRole
                ? outcome.dealerScore
                : outcome.playerScore
            : outcome.dealerScore;
        const opponentName = inPvp
            ? viewerRole === playerRole
                ? roleDisplayName(dealerRoleForRound)
                : roleDisplayName(playerRole)
            : "Dealer";
        const selfName = inPvp ? playerDisplayName || "You" : "You";
        const winnerName = winnerRole
            ? winnerRole === viewerRole
                ? selfName
                : roleDisplayName(winnerRole)
            : "";

        const viewerBust = inPvp
            ? (viewerRole === playerRole && outcome.reason === "player_bust") ||
                (viewerRole === dealerRoleForRound && outcome.reason === "dealer_bust")
            : outcome.reason === "player_bust";
        const opponentBust = inPvp
            ? (viewerRole === playerRole && outcome.reason === "dealer_bust") ||
                (viewerRole === dealerRoleForRound && outcome.reason === "player_bust")
            : outcome.reason === "dealer_bust";

        if (inPvp && myRole === 'host') {
            applyOutcomeToLives(outcome);
            sendGameStateToGuest();
        } else {
            renderLives();
        }

        const matchResolvedRole = matchWinner;
        const viewerWinsMatch = matchResolvedRole ? matchResolvedRole === viewerRole : viewerWins;

        let title;
        if (matchResolvedRole) {
            title = viewerWinsMatch ? "You Win the Match!" : `${roleDisplayName(matchResolvedRole)} Wins!`;
        } else if (outcome.winner === "push") {
            title = "Push";
        } else if (viewerWins) {
            title = "You Win!";
        } else {
            title = "You Lose";
        }

        let message;
        if (matchResolvedRole) {
            const loserRole = matchResolvedRole === 'host' ? 'guest' : 'host';
            const loserName = roleDisplayName(loserRole);
            message = viewerWinsMatch
                ? `${loserName} is out of hearts.`
                : `${roleDisplayName(matchResolvedRole)} claimed the last heart.`;
        } else if (outcome.winner === "push") {
            message = `Both at ${viewerScore}.`;
        } else if (viewerBust) {
            message = "You lost a Heart";
        } else if (opponentBust) {
            message = `${opponentName} lost a Heart`;
        } else {
            const winnerScore = outcome.winner === "player" ? outcome.playerScore : outcome.dealerScore;
            const loserScore = outcome.winner === "player" ? outcome.dealerScore : outcome.playerScore;
            message = viewerWins
                ? `You led ${winnerScore} to ${loserScore}.`
                : `${opponentName} led ${winnerScore} to ${loserScore}.`;
        }

        if (modalContentEl) {
            modalContentEl.classList.remove("modal-win", "modal-lose", "modal-push");
            const stateClass =
                outcome.winner === "push"
                    ? "modal-push"
                    : viewerWinsMatch
                        ? "modal-win"
                        : "modal-lose";
            modalContentEl.classList.add(stateClass);
        }

        if (game.modalTitle) {
            game.modalTitle.textContent = title;
            game.modalTitle.style.color =
                outcome.winner === "push"
                    ? "#f39c12"
                    : viewerWinsMatch
                        ? "#7dd3c0"
                        : "#e74c3c";
        }

        if (game.modalMessage) {
            game.modalMessage.textContent = message;
        }

        if (game.modalIcon) {
            game.modalIcon.textContent = "";
            game.modalIcon.classList.remove("heart-icon", "heart-win", "heart-lose", "heart-push");
            game.modalIcon.classList.add("heart-icon");
            if (outcome.winner === "push") {
                game.modalIcon.classList.add("heart-push");
            } else if (viewerWinsMatch) {
                game.modalIcon.classList.add("heart-win");
            } else {
                game.modalIcon.classList.add("heart-lose");
            }
        }

        if (game.gameModal) {
            game.gameModal.classList.add("show");
        }
        if (typeof window.handleRoundEnd === "function") {
            window.handleRoundEnd();
        }
        updateRematchStatus();
    };

    const originalShowResult = game.showResult.bind(game);
    game.showResult = (result, message, icon) => {
        const outcome = computeOutcome();
        if (outcome) {
            renderOutcomeModal(outcome);
            return;
        }
        originalShowResult(result, message, icon);
    };

    const originalShowExternalResult = game.showExternalResult.bind(game);
    game.showExternalResult = (payload) => {
        const outcome = payload && (payload.winner ? payload : payload.outcome);
        if (outcome) {
            renderOutcomeModal(outcome);
            return;
        }
        originalShowExternalResult(payload || {});
    };

    const enterPostRoundState = () => {
        if (isPvpSession()) {
            lobbyGameStarted = false;
            postRoundReady = false;
            if (myRole === 'host') {
                guestReady = false;
            } else if (myRole === 'guest') {
                myReady = false;
                guestReady = false;
                if (readySupported && typeof lobbyClient.setReady === 'function') {
                    lobbyClient.setReady(false);
                }
            }
            syncHostStartState();
            syncGuestReadyButton();
            updateRematchStatus();
        }
    };

    window.handleRoundEnd = () => {
        enterPostRoundState();
        updateRematchStatus();
    };

    window.updateGuestRematchReady = () => {
        if (myRole !== 'guest') return;
        myReady = !myReady;
        syncGuestReadyButton();
        updateRematchStatus();
        if (readySupported && typeof lobbyClient.setReady === 'function') {
            lobbyClient.setReady(myReady);
        }
    };

    window.hostTryRematch = () => {
        if (myRole !== 'host') return;
        if (!guestReady) {
            updateRematchStatus();
            return;
        }
        startHostPvpGame();
    };

    game.playerHit = async () => {
        if (isPvpSession()) {
            const iAmPlayer = playerSide === myRole;
            if (game.gameState === 'PLAYER_TURN') {
                if (!iAmPlayer) return;
                if (myRole === 'guest') {
                    sendPlayerActionToHost('hit');
                    return;
                }
                await originalPlayerHit();
                sendGameStateToGuest();
                syncActionButtons();
                return;
            }
            if (game.gameState === 'DEALER_TURN' && game.manualDealerMode) {
                if (iAmPlayer) return;
                if (myRole === 'guest') {
                    sendDealerActionToHost('hit');
                    return;
                }
                await game.dealerHitManual();
                sendGameStateToGuest();
                syncActionButtons();
                return;
            }
            return;
        }
        await originalPlayerHit();
    };

    game.playerStand = async () => {
        if (isPvpSession()) {
            const iAmPlayer = playerSide === myRole;
            if (game.gameState === 'PLAYER_TURN') {
                if (!iAmPlayer) return;
                if (myRole === 'guest') {
                    sendPlayerActionToHost('stand');
                    return;
                }
                await originalPlayerStand();
                sendGameStateToGuest();
                syncActionButtons();
                updateRematchStatus();
                return;
            }
            if (game.gameState === 'DEALER_TURN' && game.manualDealerMode) {
                if (iAmPlayer) return;
                if (myRole === 'guest') {
                    sendDealerActionToHost('stand');
                    return;
                }
                await game.dealerStandManual();
                sendGameStateToGuest();
                syncActionButtons();
                updateRematchStatus();
                return;
            }
            return;
        }
        await originalPlayerStand();
    };

    // Initialize overlay/body state on load
    syncOverlayState();
    syncNameLabels();
    updateProfileVisibility();
    updateControlledSide();
    renderLives();

    const showErrorOverlay = ({ message, title = 'Connection Failed', retryAction } = {}) => {
        if (errorTitleEl) errorTitleEl.textContent = title;
        if (errorMessageEl) errorMessageEl.textContent = message || 'Something went wrong.';
        lastRetryAction = retryAction || null;
        if (errorRetryButton) {
            errorRetryButton.style.display = retryAction ? '' : 'none';
        }
        showOverlay(errorOverlay);
    };

    const hideErrorOverlay = () => {
        lastRetryAction = null;
        hideOverlay(errorOverlay);
    };

    const startPlay = ({ autoDeal = true } = {}) => {
        closeProfilePopover();
        // Remember the last visible overlay so we can return to it if the player backs out
        if (isOverlayVisible(lobbyRoomScreen)) {
            lastOverlayBeforeGame = lobbyRoomScreen;
        } else if (isOverlayVisible(lobbyScreen) || isOverlayVisible(creatingLobbyScreen)) {
            lastOverlayBeforeGame = lobbyScreen;
        } else {
            lastOverlayBeforeGame = titleScreen;
        }
        hideBackConfirm();
        hideOverlay(titleScreen);
        hideOverlay(lobbyScreen);
        hideOverlay(creatingLobbyScreen);
        hideOverlay(lobbyRoomScreen);
        updateControlledSide();
        renderLives();
        syncNameLabels();
        if (autoDeal) {
            game.startGame();
        } else {
            game.setButtonsEnabled(false);
            game.closeModal();
            game.resetHands({ reshuffle: true });
            // Move out of the previous round's GAME_OVER state before sending sync updates
            game.gameState = 'DEALING';
        }
        if (resetButton && isPvpSession()) {
            resetButton.style.display = 'none';
        } else if (resetButton) {
            resetButton.style.display = '';
        }
    };

    const openMultiplayerLobby = () => {
        closeProfilePopover();
        swapOverlay(titleScreen, lobbyScreen);
    };

    const renderUsers = (users) => {
        if (!userListEl) return;
        userListEl.innerHTML = '';
        let foundGuestReady = false;
        let hasGuest = false;
        hostName = 'Host';
        guestName = 'Dealer';
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

            if (user.role === 'guest') {
                guestName = user.name;
                const ready = !!user.ready;
                hasGuest = true;
                const dot = document.createElement('div');
                dot.className = `ready-dot ${ready ? 'ready' : 'not-ready'}`;
                tag.appendChild(dot);
                foundGuestReady = foundGuestReady || ready;
            }

            if (user.role === 'host') {
                hostName = user.name;
            }

            const tagText = document.createElement('span');
            tagText.textContent = user.role === 'host' ? 'Host' : 'Guest';
            tag.appendChild(tagText);

            userListEl.appendChild(li);
            li.appendChild(tag);
        });

        guestPresent = hasGuest;
        guestReady = readySupported ? foundGuestReady : hasGuest;
        if (myRole === 'guest') {
            myReady = guestReady;
            syncGuestReadyButton();
        }
        syncHostStartState();
        syncNameLabels();
        updateRematchStatus();
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
        myReady = false;
        guestReady = false;
        guestPresent = false;
        lobbyGameStarted = false;
        currentTurn = 'player';
        resetMatchState();
        renderLives();
        if (lobbyCodeEl) lobbyCodeEl.textContent = code;
        renderUsers(players || []);
        resetChat();
        if (notice) appendChatMessage('System', notice);
        updateRoleControlsVisibility();
        syncHostStartState();
        syncGuestReadyButton();
        syncNameLabels();
        updateControlledSide();
        renderLives();
        showOverlay(lobbyRoomScreen);
        if (resetButton) resetButton.style.display = 'none';
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

    const fillJoinCodeFromText = (text) => {
        const digits = (text || '').replace(/\D/g, '').slice(0, 6);
        if (digits.length !== 6) return false;
    joinCodeInputs.forEach((inp, idx) => {
            inp.value = digits[idx] || '';
        });
        setJoinConnectEnabled();
        if (connectLobbyButton) connectLobbyButton.focus();
        return true;
    };

    const handleError = (message, retryAction) => {
        hideOverlay(creatingLobbyScreen);
        showOverlay(lobbyScreen);
        showErrorOverlay({
            message: message || 'Failed to reach server.',
            retryAction,
        });
    };

    const leaveLobby = () => {
        if (currentLobbyCode) {
            if (typeof lobbyClient.leaveLobby === 'function') {
                lobbyClient.leaveLobby();
            } else {
                lobbyClient.send('leave_lobby', {});
            }
            currentLobbyCode = null;
        }
        myRole = null;
        myReady = false;
        guestReady = false;
        guestPresent = false;
        lobbyGameStarted = false;
        currentTurn = 'player';
        hostName = 'Host';
        guestName = 'Dealer';
        resetMatchState();
        game.setNetworkRole('local');
        game.setManualDealerMode(false);
        updateControlledSide();
        renderLives();
        if (userListEl) userListEl.innerHTML = '';
        if (lobbyCodeEl) lobbyCodeEl.textContent = '------';
        resetChat();
        hideOverlay(lobbyRoomScreen);
        showOverlay(lobbyScreen);
        syncNameLabels();
        if (resetButton) resetButton.style.display = '';
    };

    const startCreatingLobby = async () => {
        swapOverlay(lobbyScreen, creatingLobbyScreen);
        setLoadingMessage('Creating lobby ...');
        try {
            await lobbyClient.createLobby();
        } catch (err) {
            handleError('Failed to reach server.', () => startCreatingLobby());
        }
    };

    const startJoiningLobby = async () => {
        const code = readJoinCode();
        if (code.length !== 6 || /\D/.test(code)) return;
        swapOverlay(lobbyScreen, creatingLobbyScreen);
        setLoadingMessage('Joining lobby ...');

        try {
            await lobbyClient.joinLobby(code);
        } catch (err) {
            handleError('Failed to reach server.', () => startJoiningLobby());
        }
    };

    const startHostPvpGame = async () => {
        if (!isPvpSession() || myRole !== 'host') return;
        if (matchWinner) {
            resetMatchState();
            renderLives();
        }
        playerSide = nextPlayerSide;
        nextPlayerSide = playerSide === 'host' ? 'guest' : 'host';
        roundOutcomeApplied = false;
        lobbyGameStarted = true;
        postRoundReady = false;
        currentTurn = 'player';
        game.setNetworkRole('host');
        game.setManualDealerMode(true);
        updateControlledSide();
        renderLives();
        startPlay({ autoDeal: false });
        game.closeModal();
        game.resetHands({ reshuffle: true });
        sendGameStateToGuest(); // push guest into gameplay view immediately
        await game.dealCardToPlayer();
        sendGameStateToGuest();
        await game.delay(200);
        await game.dealCardToDealer();
        sendGameStateToGuest();
        await game.delay(200);
        await game.dealCardToPlayer();
        sendGameStateToGuest();
        await game.delay(200);
        await game.dealCardToDealer();
        sendGameStateToGuest();
        game.gameState = 'PLAYER_TURN';
        syncActionButtons();
        syncHostStartState();
        syncGuestReadyButton();
        syncActionButtons();
        sendGameStateToGuest();
        updateRematchStatus();
    };

    const isTypingInField = (event) => {
        const target = event.target;
        if (!target) return false;
        const tag = target.tagName;
        return (
            target.isContentEditable ||
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            tag === 'SELECT'
        );
    };

    const exitToPreviousLayer = () => {
        hideBackConfirm();
        game.closeModal();
        game.resetHands({ reshuffle: true });
        game.gameState = 'INITIAL';
        game.setButtonsEnabled(false);
        lobbyGameStarted = false;
        currentTurn = 'player';
        game.setManualDealerMode(false);
        game.setNetworkRole(currentLobbyCode ? (myRole || 'local') : 'local');
        hideOverlay(creatingLobbyScreen);
        hideOverlay(lobbyRoomScreen);
        hideOverlay(lobbyScreen);
        showOverlay(lastOverlayBeforeGame || titleScreen);
    };

    const promptLeaveLobby = () => {
        showBackConfirm(
            {
                title: 'Leave lobby?',
                message: 'You will leave the lobby. Host role transfers to the remaining player.',
                exitLabel: 'Leave Lobby',
                stayLabel: 'Stay',
            },
            leaveLobby
        );
    };

    const goBackOneLayer = () => {
        if (isOverlayVisible(errorOverlay)) {
            hideErrorOverlay();
            return;
        }

        if (isBackConfirmVisible()) {
            hideBackConfirm();
            return;
        }

        // If we are in gameplay view, confirm before backing out
        if (isInGameplayView()) {
            showBackConfirm(
                {
                    title: 'Leave current game?',
                    message: 'Your current hand will be abandoned. Return to the previous screen?',
                    exitLabel: 'Exit Game',
                    stayLabel: 'Keep Playing',
                },
                exitToPreviousLayer
            );
            return;
        }

        // If currently in a lobby room (host or guest), always confirm before leaving
        if (currentLobbyCode || isOverlayVisible(lobbyRoomScreen)) {
            promptLeaveLobby();
            return;
        }

        // If join form is open, close it first
        if (joinForm && !joinForm.classList.contains('hidden')) {
            joinForm.classList.add('hidden');
            resetJoinInputs();
            return;
        }

        // If in loading/creating state, go back to lobby selection
        if (isOverlayVisible(creatingLobbyScreen)) {
            hideOverlay(creatingLobbyScreen);
            showOverlay(lobbyScreen);
            return;
        }

        // If on lobby selection, go back to title
        if (isOverlayVisible(lobbyScreen)) {
            hideOverlay(lobbyScreen);
            showOverlay(titleScreen);
            resetJoinInputs();
            return;
        }

        // If all overlays are hidden (in-game), bring back the title screen
        if (titleScreen && titleScreen.classList.contains('hidden')) {
            showOverlay(titleScreen);
        }
    };

    if (profileButton) {
        profileButton.addEventListener('click', () => {
            if (profilePopover && profilePopover.classList.contains('hidden')) {
                openProfilePopover();
            } else {
                closeProfilePopover();
            }
        });
    }

    if (profileCloseButton) {
        profileCloseButton.addEventListener('click', () => closeProfilePopover());
    }

    if (profileSaveButton) {
        profileSaveButton.addEventListener('click', () => {
            acceptProfileName();
            syncNameLabels();
            closeProfilePopover();
        });
    }

    if (profileNameInput) {
        profileNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                acceptProfileName();
                syncNameLabels();
                closeProfilePopover();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeProfilePopover();
            }
        });
    }

    document.addEventListener('mousedown', (e) => {
        if (!profilePopover || profilePopover.classList.contains('hidden')) return;
        const clickedInside = profilePopover.contains(e.target);
        const clickedButton = profileButton && profileButton.contains(e.target);
        if (!clickedInside && !clickedButton) {
            closeProfilePopover();
        }
    });

    syncNameLabels();

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

    if (deckContainerEl) {
        deckContainerEl.addEventListener('click', () => {
            if (game.hitButton && game.hitButton.disabled) return;
            game.playerHit();
        });
    }

    if (game.hitButton) {
        game.hitButton.style.display = 'none';
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

    if (guestReadyButton) {
        guestReadyButton.addEventListener('click', () => {
            if (lobbyGameStarted) return;
            if (myRole !== 'guest') return;
            myReady = !myReady;
            syncGuestReadyButton();
            if (readySupported && typeof lobbyClient.setReady === 'function') {
                lobbyClient.setReady(myReady);
            } else {
                appendChatMessage('System', 'Ready toggle is only available in Peer lobbies.');
            }
        });
    }

    if (hostStartButton) {
        hostStartButton.addEventListener('click', async () => {
            if (myRole !== 'host') return;
            if (hostStartButton.disabled) return;
            if (typeof lobbyClient.startGame === 'function') {
                lobbyClient.startGame();
            }
            await startHostPvpGame();
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

    if (errorOkButton) {
        errorOkButton.addEventListener('click', () => hideErrorOverlay());
    }

    if (errorRetryButton) {
        errorRetryButton.addEventListener('click', () => {
            const retry = lastRetryAction;
            hideErrorOverlay();
            if (retry) retry();
        });
    }

    if (backConfirmStay) {
        backConfirmStay.addEventListener('click', () => hideBackConfirm());
    }

    if (backConfirmExit) {
        backConfirmExit.addEventListener('click', () => {
            const action = backConfirmAction;
            hideBackConfirm();
            if (typeof action === 'function') {
                action();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key && e.key.toLowerCase() === 'b' && !isTypingInField(e)) {
            e.preventDefault();
            e.stopPropagation();
            goBackOneLayer();
        }
    });

    joinCodeInputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            const value = e.target.value.replace(/\D/g, "").slice(0, 1);
            e.target.value = value;
            if (value && index < joinCodeInputs.length - 1) {
                const next = joinCodeInputs[index + 1];
                if (next) next.focus();
            }
            setJoinConnectEnabled();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !e.target.value) {
                const prev = joinCodeInputs[index - 1];
                if (prev) prev.focus();
                e.preventDefault();
            }
        });
    });

    if (pasteLobbyCodeButton) {
        pasteLobbyCodeButton.addEventListener("click", async () => {
            if (!navigator.clipboard || !joinCodeInputs.length) return;
            try {
                const text = await navigator.clipboard.readText();
                const ok = fillJoinCodeFromText(text);
                if (!ok && pasteLobbyCodeButton) {
                    pasteLobbyCodeButton.classList.add("shake");
                    setTimeout(() => pasteLobbyCodeButton.classList.remove("shake"), 400);
                }
            } catch (err) {
                console.warn("Clipboard read failed", err);
            }
        });
    }

    lobbyClient.on('lobby_created', ({ code, players }) => {
        myRole = 'host';
        showLobbyRoom({ code, players, notice: 'Lobby created. Share the code to invite a friend.' });
    });

    lobbyClient.on('lobby_joined', ({ code, players }) => {
        myRole = 'guest';
        showLobbyRoom({ code, players, notice: 'Joined lobby. Say hi!' });
    });

    lobbyClient.on('lobby_update', ({ players }) => {
        renderUsers(players || []);
    });

    lobbyClient.on('chat_message', ({ from, text }) => {
        appendChatMessage(from || 'Player', text);
    });

    lobbyClient.on('game_start', () => {
        lobbyGameStarted = true;
        syncHostStartState();
        syncGuestReadyButton();
        appendChatMessage('System', 'Game is starting...');
        if (!gameSyncSupported) {
            startPlay();
            return;
        }
        if (myRole === 'guest') {
            game.setNetworkRole('guest');
            game.setManualDealerMode(false);
            startPlay({ autoDeal: false });
            game.setButtonsEnabled(false);
            syncActionButtons();
        }
    });

    lobbyClient.on('game_state', (state) => {
        if (myRole === 'guest') {
            applyRemoteSnapshot(state);
        }
    });

    lobbyClient.on('dealer_action', ({ action }) => {
        if (myRole !== 'host') return;
        if (!lobbyGameStarted || game.gameState !== 'DEALER_TURN') return;
        if (playerSide === 'guest') return;
        if (action === 'hit') {
            game.dealerHitManual().then(() => {
                sendGameStateToGuest();
                syncActionButtons();
            });
        } else if (action === 'stand') {
            game.dealerStandManual();
            sendGameStateToGuest();
            syncActionButtons();
        }
    });

    lobbyClient.on('player_action', ({ action }) => {
        if (myRole !== 'host') return;
        if (!lobbyGameStarted || game.gameState !== 'PLAYER_TURN') return;
        if (playerSide !== 'guest') return;
        if (action === 'hit') {
            originalPlayerHit().then(() => {
                sendGameStateToGuest();
                syncActionButtons();
            });
        } else if (action === 'stand') {
            originalPlayerStand().then(() => {
                sendGameStateToGuest();
                syncActionButtons();
                updateRematchStatus();
            });
        }
    });

    lobbyClient.on('error', ({ message }) => {
        handleError(message);
    });
});









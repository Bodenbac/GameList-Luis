/**
 * Card Renderer with Fan Animation
 * Handles card rendering with n-form (player) and u-form (dealer) fans
 */

class CardRenderer {
    constructor() {
        this.cardWidth = 100;
        this.cardHeight = 150;
        this.arcIntensity = 20; // Pixels of arc height
    }

    /**
     * Create a card DOM element
     */
    createCardElement(card, isDealer = false) {
        const cardEl = document.createElement('div');
        cardEl.className = `playing-card ${card.color}`;

        const content = document.createElement('div');
        content.className = 'card-content';

        const rank = document.createElement('div');
        rank.className = 'card-rank';
        rank.textContent = card.rank;

        const suit = document.createElement('div');
        suit.className = 'card-suit';
        suit.textContent = card.suit;

        content.appendChild(rank);
        content.appendChild(suit);
        cardEl.appendChild(content);

        return cardEl;
    }

    /**
     * Calculate fan position for a card
     * @param {number} cardIndex - Index of card in hand
     * @param {number} totalCards - Total cards in hand
     * @param {boolean} isDealer - If true, creates u-form fan; if false, n-form fan
     */
    calculateFanPosition(cardIndex, totalCards, isDealer = false) {
        // Fan parameters
        const maxAngle = Math.min(45, totalCards * 8);
        const angleStep = totalCards > 1 ? maxAngle / (totalCards - 1) : 0;
        const startAngle = -maxAngle / 2;

        // Card spacing (horizontal)
        const cardSpacing = totalCards === 1 ? 0 : Math.max(30, 55 - totalCards * 3);
        const totalWidth = (totalCards - 1) * cardSpacing;
        const startX = -totalWidth / 2;

        // Calculate position
        const angle = startAngle + (cardIndex * angleStep);
        const x = startX + (cardIndex * cardSpacing);

        // Arc calculation (parabola)
        const normalizedPos = totalCards > 1 ? (2.0 * cardIndex / (totalCards - 1)) - 1.0 : 0;
        const arcOffset = this.arcIntensity * (1 - normalizedPos * normalizedPos);

        // For dealer (u-form): center cards go DOWN (positive Y)
        // For player (n-form): center cards go UP (negative Y)
        const y = isDealer ? arcOffset : -arcOffset;

        return {
            x: x,
            y: y,
            rotation: angle,
            zIndex: cardIndex
        };
    }

    /**
     * Render cards in a fanned formation
     */
    renderFannedCards(container, cards, isDealer = false) {
        container.innerHTML = '';

        cards.forEach((card, index) => {
            const cardDisplay = getCardDisplay(card);
            const cardEl = this.createCardElement(cardDisplay, isDealer);

            const position = this.calculateFanPosition(index, cards.length, isDealer);

            // Apply positioning and rotation
            cardEl.style.transform = `
                translate(${position.x}px, ${position.y}px)
                rotate(${position.rotation}deg)
            `;
            cardEl.style.zIndex = position.zIndex;

            container.appendChild(cardEl);
        });
    }

    /**
     * Animate card from deck to hand
     */
    async animateCardDeal(card, targetContainer, cardIndex, totalCards, isDealer = false) {
        return new Promise((resolve) => {
            const cardDisplay = getCardDisplay(card);
            const cardEl = this.createCardElement(cardDisplay, isDealer);

            // Get deck position
            const deckContainer = document.getElementById('deckContainer');
            const deckRect = deckContainer.getBoundingClientRect();
            const targetRect = targetContainer.getBoundingClientRect();

            // Calculate target position within the fan
            const fanPosition = this.calculateFanPosition(cardIndex, totalCards, isDealer);

            // Start position (at deck)
            const startX = deckRect.left + deckRect.width / 2 - this.cardWidth / 2;
            const startY = deckRect.top + deckRect.height / 2 - this.cardHeight / 2;

            // Target position (in hand)
            const centerX = targetRect.left + targetRect.width / 2;
            const centerY = targetRect.top + targetRect.height / 2;

            // Set initial position
            cardEl.style.position = 'fixed';
            cardEl.style.left = startX + 'px';
            cardEl.style.top = startY + 'px';
            cardEl.style.zIndex = 1000 + cardIndex;

            document.body.appendChild(cardEl);

            // Trigger animation after a small delay (for CSS transition)
            setTimeout(() => {
                cardEl.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                cardEl.style.left = (centerX + fanPosition.x - this.cardWidth / 2) + 'px';
                cardEl.style.top = (centerY + fanPosition.y - this.cardHeight / 2) + 'px';
                cardEl.style.transform = `rotate(${fanPosition.rotation}deg)`;
            }, 50);

            // After animation, move to target container
            setTimeout(() => {
                document.body.removeChild(cardEl);

                // Create new card in target container
                const finalCardEl = this.createCardElement(cardDisplay, isDealer);
                const position = this.calculateFanPosition(cardIndex, totalCards, isDealer);

                finalCardEl.style.transform = `
                    translate(${position.x}px, ${position.y}px)
                    rotate(${position.rotation}deg)
                `;
                finalCardEl.style.zIndex = position.zIndex;

                targetContainer.appendChild(finalCardEl);
                resolve();
            }, 650);
        });
    }

    /**
     * Re-arrange existing cards when a new card is added
     */
    rearrangeFan(container, cards, isDealer = false) {
        const cardElements = container.querySelectorAll('.playing-card');

        cardElements.forEach((cardEl, index) => {
            const position = this.calculateFanPosition(index, cards.length, isDealer);

            cardEl.style.transition = 'all 0.3s ease-out';
            cardEl.style.transform = `
                translate(${position.x}px, ${position.y}px)
                rotate(${position.rotation}deg)
            `;
            cardEl.style.zIndex = position.zIndex;
        });
    }
}

// Create global card renderer instance
const cardRenderer = new CardRenderer();

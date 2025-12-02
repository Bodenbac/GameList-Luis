/**
 * Deck Management System
 * Manages a 6-deck shoe with shuffling and card drawing
 */

class Deck {
    constructor() {
        this.cards = [];
        this.currentIndex = 0;
        this.initialize();
        this.shuffle();
    }

    initialize() {
        // Create 6 decks (312 cards total)
        for (let deck = 0; deck < 6; deck++) {
            for (let rank = 1; rank <= 13; rank++) {
                // 4 suits per rank
                for (let suit = 0; suit < 4; suit++) {
                    this.cards.push({
                        rank: rank,
                        suit: suit,
                        value: this.getCardValue(rank)
                    });
                }
            }
        }
    }

    getCardValue(rank) {
        if (rank === 1) return 11; // Ace
        if (rank >= 11) return 10; // Face cards
        return rank; // Number cards
    }

    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        this.currentIndex = 0;
    }

    drawCard() {
        if (this.currentIndex >= this.cards.length) {
            this.shuffle();
        }
        const card = this.cards[this.currentIndex];
        this.currentIndex++;
        return { ...card }; // Return a copy
    }

    remainingCards() {
        return this.cards.length - this.currentIndex;
    }

    reset() {
        this.shuffle();
    }
}

/**
 * Card Display Information
 */
const CARD_INFO = {
    ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    suits: ['♥', '♦', '♣', '♠'],
    suitColors: ['red', 'red', 'black', 'black']
};

function getCardDisplay(card) {
    return {
        rank: CARD_INFO.ranks[card.rank - 1],
        suit: CARD_INFO.suits[card.suit],
        color: CARD_INFO.suitColors[card.suit],
        value: card.value
    };
}

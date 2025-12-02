import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;

public class Deck {

    private ArrayList<Integer> cards;
    private int currentIndex;

    public Deck() {
        cards = new ArrayList<>();
        currentIndex = 0;
        initializeDeck();
        shuffle();
    }

    private void initializeDeck() {
        // Create a deck with multiple sets of cards (6 decks for realistic casino play)
        for (int deck = 0; deck < 6; deck++) {
            for (int i = 1; i <= 13; i++) {
                // Add 4 cards of each type (one per suit)
                for (int suit = 0; suit < 4; suit++) {
                    cards.add(i);
                }
            }
        }
    }

    public void shuffle() {
        Collections.shuffle(cards);
        currentIndex = 0;
    }

    public Card drawCard() throws IOException {
        if (currentIndex >= cards.size()) {
            // Reshuffle when deck is exhausted
            shuffle();
        }
        int cardType = cards.get(currentIndex);
        currentIndex++;
        return new Card(cardType);
    }

    public int remainingCards() {
        return cards.size() - currentIndex;
    }

    public void reset() {
        shuffle();
    }
}

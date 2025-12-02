import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.geom.Point2D;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;

public class GameFrame extends JFrame implements ActionListener {
    public static final int width = 1200, height = 800;

    //Game States
    enum GameState {
        INITIAL,      // Before first deal
        DEALING,      // Cards being dealt
        PLAYER_TURN,  // Player can draw or stand
        DEALER_TURN,  // Dealer drawing cards
        GAME_OVER     // Round finished
    }

    private GameState gameState = GameState.INITIAL;
    private Deck deck;
    private Timer animationTimer;
    private Timer dealingTimer;

    // Deck position on screen (center top - where cards come from)
    private static final int DECK_X = width / 2 - Card.width / 2;
    private static final int DECK_Y = 80;

    // Animation parameters
    private static final int CARD_ANIMATION_DURATION = 500; // milliseconds
    private static final int DEAL_DELAY = 400; // delay between dealing cards

    //Buttons
    static public Button draw, stay, reset;
    ArrayList<Button> buttons;

    //Player
    static Player you = new Player();
    static Player bank = new Player();

    public GameFrame() {

        //Initialize Deck
        deck = new Deck();

        //Setup animation timer (60 FPS)
        animationTimer = new Timer(16, e -> {
            if (you.hasAnimatingCards() || bank.hasAnimatingCards()) {
                repaint();
            } else {
                animationTimer.stop();
            }
        });

        //Create Buttons
        draw = new Button(400, 20, "Draw Card"); //Hit
        stay = new Button(550, 20, "Stand");     //Stand
        reset = new Button(700, 20, "Reset");
        buttons = new ArrayList<>(Arrays.asList(draw, stay, reset));

        //Start first game with initial deal
        dealingTimer = new Timer(DEAL_DELAY, null);
        dealingTimer.setRepeats(false);
        try {
            dealInitialCardsAnimated();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        //Create Content Panel
        JPanel panel = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);

                for (Button b : buttons) {
                    g.setColor(Color.black);
                    g.fillRect(b.getX(), b.getY(), Button.width, Button.height);
                    b.setBounds(b.getX(), b.getY(), Button.width, Button.height);
                }

                //Trennlinie
                g.drawLine(width/2, 100, width/2, height);

                // Draw the deck as a stack of cards
                Graphics2D g2d = (Graphics2D) g;
                DeckRenderer.drawDeck(g2d, DECK_X, DECK_Y, deck.remainingCards());

                //Draw Cards
                you.drawYourCards(g);
                bank.drawYourCards(g);

                //Draw Score
                you.drawPlayerScore(g);
                bank.drawPlayerScore(g);

                // Draw player labels
                g.setFont(new Font("Arial", Font.BOLD, 20));
                g.setColor(Color.WHITE);
                g.drawString("YOU", width / 4 - 20, 380);
                g.drawString("DEALER", width * 3 / 4 - 40, 380);

                // Only repaint when necessary (not infinite loop)
                // repaint() is called automatically by Swing when needed
            }
        };
        panel.setPreferredSize(new Dimension(width, height));
        panel.setBackground(Color.gray);

        for (Button b : buttons) {
            b.addActionListener(this);
            panel.add(b);
        }

        //Frame
        this.setContentPane(panel);
        this.pack();
        this.setLocationRelativeTo(null);
        this.setDefaultCloseOperation(EXIT_ON_CLOSE);
        this.setVisible(true);

    }

    @Override
    public void actionPerformed(ActionEvent e) {
        Button clicked = (Button) e.getSource();

        //Draw Card
        if (clicked.getText().equals("Draw Card") && gameState == GameState.PLAYER_TURN) {
            try {
                youDrawCard();
                checkGameStatus();
            } catch (IOException ex) {
                throw new RuntimeException(ex);
            }
        }
        //Stand
        if (clicked.getText().equals("Stand") && gameState == GameState.PLAYER_TURN) {
            you.isPlaying = false;
            gameState = GameState.DEALER_TURN;
            setStatus(false);

            try {
                bankFillCards();
            } catch (IOException ex) {
                throw new RuntimeException(ex);
            }
            checkGameStatus();
        }

        //Reset
        if (clicked.getText().equals("Reset")) {
            try {
                resetGame();
            } catch (IOException ex) {
                throw new RuntimeException(ex);
            }
        }

    }

    private void dealInitialCards() throws IOException {
        gameState = GameState.DEALING;

        // Deal 2 cards to player
        you.cards.add(deck.drawCard());
        you.cards.add(deck.drawCard());
        you.score = calculatePlayerScore(you);

        // Deal 2 cards to dealer
        bank.cards.add(deck.drawCard());
        bank.cards.add(deck.drawCard());
        bank.score = calculatePlayerScore(bank);

        // Check for immediate blackjack
        if (you.score == 21 || bank.score == 21) {
            gameState = GameState.GAME_OVER;
            checkGameStatus();
        } else {
            gameState = GameState.PLAYER_TURN;
        }

        repaint();
    }

    /**
     * Deal initial cards with animation
     */
    private void dealInitialCardsAnimated() throws IOException {
        gameState = GameState.DEALING;
        setStatus(false); // Disable buttons during dealing

        // Deal cards one at a time with delays
        final int[] dealCount = {0};

        dealingTimer = new Timer(DEAL_DELAY, new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                try {
                    switch (dealCount[0]) {
                        case 0: // First card to player
                            dealCardToPlayerAnimated(you, CARD_ANIMATION_DURATION);
                            break;
                        case 1: // First card to dealer
                            dealCardToPlayerAnimated(bank, CARD_ANIMATION_DURATION);
                            break;
                        case 2: // Second card to player
                            dealCardToPlayerAnimated(you, CARD_ANIMATION_DURATION);
                            break;
                        case 3: // Second card to dealer
                            dealCardToPlayerAnimated(bank, CARD_ANIMATION_DURATION);
                            dealingTimer.stop();

                            // After all cards dealt, check game status
                            Timer checkTimer = new Timer(CARD_ANIMATION_DURATION + 100, evt -> {
                                you.score = calculatePlayerScore(you);
                                bank.score = calculatePlayerScore(bank);

                                if (you.score == 21 || bank.score == 21) {
                                    gameState = GameState.GAME_OVER;
                                    checkGameStatus();
                                } else {
                                    gameState = GameState.PLAYER_TURN;
                                    setStatus(true); // Enable buttons for player turn
                                }
                                repaint();
                            });
                            checkTimer.setRepeats(false);
                            checkTimer.start();
                            break;
                    }
                    dealCount[0]++;
                } catch (IOException ex) {
                    throw new RuntimeException(ex);
                }
            }
        });

        dealingTimer.setRepeats(true);
        dealingTimer.start();
    }

    /**
     * Deal a single card to a player with animation
     */
    private void dealCardToPlayerAnimated(Player player, int duration) throws IOException {
        Card card = deck.drawCard();
        player.cards.add(card);

        // Calculate target position for this card
        int cardIndex = player.cards.size() - 1;
        Point2D.Double targetPos = player.getCardTargetPosition(cardIndex, player.cards.size());
        double targetAngle = player.getCardTargetAngle(cardIndex, player.cards.size());

        // Start animation from deck position to target position
        card.startAnimation(DECK_X, DECK_Y, targetPos.x, targetPos.y, 0, targetAngle, duration);

        // Start animation timer if not already running
        if (!animationTimer.isRunning()) {
            animationTimer.start();
        }

        repaint();
    }

    private void resetGame() throws IOException {
        gameState = GameState.INITIAL;
        you.reset();
        bank.reset();

        // Stop any running timers
        if (dealingTimer != null && dealingTimer.isRunning()) {
            dealingTimer.stop();
        }
        if (animationTimer != null && animationTimer.isRunning()) {
            animationTimer.stop();
        }

        // Check if deck needs reshuffling
        if (deck.remainingCards() < 20) {
            deck.reset();
        }

        dealInitialCardsAnimated();
    }

    private void youDrawCard() throws IOException {
        // Disable buttons during card animation
        setStatus(false);

        dealCardToPlayerAnimated(you, CARD_ANIMATION_DURATION);

        // Re-enable buttons and update score after animation
        Timer enableTimer = new Timer(CARD_ANIMATION_DURATION + 50, e -> {
            you.score = calculatePlayerScore(you);
            if (gameState == GameState.PLAYER_TURN && you.score <= 21) {
                setStatus(true);
            }
            repaint();
        });
        enableTimer.setRepeats(false);
        enableTimer.start();
    }

    private void bankFillCards() throws IOException {
        // Dealer draws cards one at a time with animation
        final Timer dealerDrawTimer = new Timer(DEAL_DELAY + CARD_ANIMATION_DURATION, new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                try {
                    if (bank.score < 16) {
                        dealCardToPlayerAnimated(bank, CARD_ANIMATION_DURATION);
                        bank.score = calculatePlayerScore(bank);
                    } else {
                        ((Timer)e.getSource()).stop();
                        bank.isPlaying = false;

                        // Small delay before showing result
                        Timer resultTimer = new Timer(300, evt -> {
                            repaint();
                        });
                        resultTimer.setRepeats(false);
                        resultTimer.start();
                    }
                } catch (IOException ex) {
                    throw new RuntimeException(ex);
                }
            }
        });

        dealerDrawTimer.setRepeats(true);
        dealerDrawTimer.start();
    }

    private int calculatePlayerScore(Player p) {
        int score = 0;
        for (Card card : p.cards) {
            score += card.value;
        }
        if (score > 21 && assInDeck(p)) {
            assToOne(p);
            score -= 10;
        }
        return score;
    }

    /**
     * checks if an ass is currently in the deck
     */
    private boolean assInDeck(Player p) {
        boolean inside = false;
        for (Card card : p.cards) {
            if (card.value == 11) inside = true;
        }
        return inside;
    }

    /**
     * transforms an ass into a card with the value of 1
     */
    private void assToOne(Player p) {
        for (Card card : p.cards) {
            if (card.value == 11) card.value = 1; break;
        }
    }

    private void checkGameStatus() {
        if (!you.isPlaying && !bank.isPlaying) {
            gameState = GameState.GAME_OVER;
            if (you.score > 21) { lose(); }
            else if (bank.score > 21) { win(); }
            else if (bank.score > you.score) { lose(); }
            else if (you.score > bank.score) { win(); }
            else { tie(); } // Equal scores = push/tie
        }
        else if (you.score > 21) {
            gameState = GameState.GAME_OVER;
            lose();
        }
    }

    private void setStatus(boolean b) {
        draw.setEnabled(b);
        stay.setEnabled(b);
    }

    private void lose() {
        JOptionPane.showMessageDialog(this, "You lost! Your score: " + you.score + " | Dealer: " + bank.score);
        setStatus(false);
    }

    private void win() {
        JOptionPane.showMessageDialog(this, "You won! Your score: " + you.score + " | Dealer: " + bank.score);
        setStatus(false);
    }

    private void tie() {
        JOptionPane.showMessageDialog(this, "Push! It's a tie at " + you.score);
        setStatus(false);
    }

}
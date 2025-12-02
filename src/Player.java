import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.geom.Point2D;
import java.util.ArrayList;

public class Player {

    public int score;
    public ArrayList<Card> cards;
    public boolean isPlaying;
    private boolean hasAnimatingCards;

    public Player(){
        score = 0;
        cards = new ArrayList<>();
        isPlaying = true;
        hasAnimatingCards = false;
    }

    public void reset() {
        this.score = 0;
        this.cards.clear();
        this.isPlaying = true;
        this.hasAnimatingCards = false;
    }

    public boolean hasAnimatingCards() {
        return hasAnimatingCards;
    }

    public void drawPlayerScore(Graphics g) {
        g.setFont(new Font("Arial", Font.BOLD, 60));

        // Player on left side, Dealer on right side
        boolean isPlayer = (this == GameFrame.you);
        int x = isPlayer ? GameFrame.width / 4 - 30 : GameFrame.width * 3 / 4 - 30;
        int y = 330;

        // Score background circle
        g.setColor(new Color(0, 0, 0, 100));
        g.fillOval(x - 5, y - 50, 70, 70);

        // Score text
        g.setColor(isPlayer ? new Color(100, 220, 100) : new Color(255, 200, 100));
        g.drawString(String.valueOf(this.score), x, y);
    }

    public void drawYourCards(Graphics g) {
        if (cards.isEmpty()) return;

        Graphics2D g2d = (Graphics2D) g;
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        int numCards = cards.size();
        hasAnimatingCards = false;

        // Calculate center position for this player's hand
        int centerX = this == GameFrame.you ? GameFrame.width / 4 : GameFrame.width * 3 / 4;
        int centerY = 420; // Base Y position for edge cards

        // Fan parameters - adjust based on number of cards
        double maxAngle = Math.min(45, numCards * 8); // Max spread angle in degrees
        double angleStep = numCards > 1 ? maxAngle / (numCards - 1) : 0;
        double startAngle = -maxAngle / 2;

        // Overlapping cards - tighter spacing for realistic hand
        int cardSpacing = numCards == 1 ? 0 : Math.max(30, 55 - numCards * 3);
        int totalWidth = (numCards - 1) * cardSpacing;
        int startX = centerX - totalWidth / 2;

        // Arc height for subtle upside-down U shape
        double arcIntensity = 20.0; // Subtle curve - center cards slightly lower

        // Draw each card with rotation and arc positioning
        for (int i = 0; i < numCards; i++) {
            Card card = cards.get(i);

            // Update card animation state
            card.updateAnimation();
            if (card.isAnimating) {
                hasAnimatingCards = true;
            }

            // Calculate final/target position for this card
            double targetAngle = startAngle + (i * angleStep);
            double targetRadians = Math.toRadians(targetAngle);
            int targetCardX = startX + (i * cardSpacing);

            // Create subtle arc (parabola)
            // Edge cards at base level, center cards slightly higher on screen
            double normalizedPos = (numCards > 1) ? (2.0 * i / (numCards - 1)) - 1.0 : 0; // Range: -1 to 1
            double arcOffset = arcIntensity * (1 - normalizedPos * normalizedPos); // Parabola: max at center, 0 at edges
            int targetCardY = centerY - (int) arcOffset; // Center has more offset = higher on screen (lower Y)

            // Use animation position if card is animating, otherwise use target position
            double cardX, cardY, radians;
            if (card.isAnimating && card.animation != null) {
                Point2D.Double currentPos = card.animation.getCurrentPosition();
                cardX = currentPos.x;
                cardY = currentPos.y;
                radians = Math.toRadians(card.animation.getCurrentAngle());
            } else {
                cardX = targetCardX;
                cardY = targetCardY;
                radians = targetRadians;
            }

            // Save the original transform
            AffineTransform oldTransform = g2d.getTransform();

            // Apply transformations: translate to card position, rotate, then draw
            AffineTransform transform = new AffineTransform();
            transform.translate(cardX, cardY);
            transform.rotate(radians, Card.width / 2, Card.height / 2);

            g2d.setTransform(transform);
            g2d.drawImage(card.img, 0, 0, null);

            // Restore original transform
            g2d.setTransform(oldTransform);
        }
    }

    /**
     * Calculate target position for a card at given index
     */
    public Point2D.Double getCardTargetPosition(int cardIndex, int totalCards) {
        int centerX = this == GameFrame.you ? GameFrame.width / 4 : GameFrame.width * 3 / 4;
        int centerY = 420; // Base Y position for edge cards

        double maxAngle = Math.min(45, totalCards * 8);
        double angleStep = totalCards > 1 ? maxAngle / (totalCards - 1) : 0;
        double startAngle = -maxAngle / 2;

        int cardSpacing = totalCards == 1 ? 0 : Math.max(30, 55 - totalCards * 3);
        int totalWidth = (totalCards - 1) * cardSpacing;
        int startX = centerX - totalWidth / 2;

        double targetAngle = startAngle + (cardIndex * angleStep);
        int targetCardX = startX + (cardIndex * cardSpacing);

        // Subtle arc calculation
        double arcIntensity = 20.0;
        double normalizedPos = (totalCards > 1) ? (2.0 * cardIndex / (totalCards - 1)) - 1.0 : 0;
        double arcOffset = arcIntensity * (1 - normalizedPos * normalizedPos);
        int targetCardY = centerY - (int) arcOffset;

        return new Point2D.Double(targetCardX, targetCardY);
    }

    /**
     * Calculate target angle for a card at given index
     */
    public double getCardTargetAngle(int cardIndex, int totalCards) {
        double maxAngle = Math.min(45, totalCards * 8);
        double angleStep = totalCards > 1 ? maxAngle / (totalCards - 1) : 0;
        double startAngle = -maxAngle / 2;

        return startAngle + (cardIndex * angleStep);
    }

}
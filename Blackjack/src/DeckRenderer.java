import java.awt.*;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;

/**
 * Renders a realistic deck of cards faced downward
 */
public class DeckRenderer {

    private static BufferedImage cardBackImage = null;
    private static final int CARD_WIDTH = Card.width;
    private static final int CARD_HEIGHT = Card.height;

    /**
     * Generate a card back image (blue pattern)
     */
    private static BufferedImage generateCardBack() {
        if (cardBackImage != null) {
            return cardBackImage;
        }

        cardBackImage = new BufferedImage(CARD_WIDTH, CARD_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = cardBackImage.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Card background - dark blue
        g2d.setColor(new Color(25, 55, 109));
        g2d.fillRoundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 10, 10);

        // Border
        g2d.setColor(new Color(200, 200, 200));
        g2d.setStroke(new BasicStroke(3));
        g2d.drawRoundRect(1, 1, CARD_WIDTH - 2, CARD_HEIGHT - 2, 10, 10);

        // Inner border
        g2d.setColor(new Color(150, 180, 220));
        g2d.setStroke(new BasicStroke(2));
        g2d.drawRoundRect(8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 8, 8);

        // Diamond pattern in center
        g2d.setColor(new Color(100, 140, 200));
        int centerX = CARD_WIDTH / 2;
        int centerY = CARD_HEIGHT / 2;

        // Draw diamond shape
        int[] xPoints = {centerX, centerX + 25, centerX, centerX - 25};
        int[] yPoints = {centerY - 40, centerY, centerY + 40, centerY};
        g2d.fillPolygon(xPoints, yPoints, 4);

        // Add small decorative circles
        g2d.setColor(new Color(70, 110, 180));
        for (int i = 0; i < 4; i++) {
            int angle = i * 90;
            int x = centerX + (int)(30 * Math.cos(Math.toRadians(angle)));
            int y = centerY + (int)(30 * Math.sin(Math.toRadians(angle)));
            g2d.fillOval(x - 4, y - 4, 8, 8);
        }

        g2d.dispose();
        return cardBackImage;
    }

    /**
     * Draw a stack of cards to represent the deck
     */
    public static void drawDeck(Graphics2D g2d, int x, int y, int remainingCards) {
        // Number of card backs to show in stack (max 10 for visual effect)
        int stackDepth = Math.min(10, Math.max(1, remainingCards / 10));

        BufferedImage cardBack = generateCardBack();

        // Enable antialiasing
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Draw shadow for depth
        g2d.setColor(new Color(0, 0, 0, 50));
        g2d.fillRoundRect(x + 5, y + 5, CARD_WIDTH, CARD_HEIGHT, 10, 10);

        // Draw stacked cards (bottom to top)
        for (int i = stackDepth - 1; i >= 0; i--) {
            int offsetX = i * 2;  // Offset each card slightly
            int offsetY = i * 2;

            // Draw card back
            g2d.drawImage(cardBack, x - offsetX, y - offsetY, null);

            // Add subtle highlight on top card
            if (i == 0) {
                g2d.setColor(new Color(255, 255, 255, 30));
                g2d.fillRoundRect(x - offsetX + 5, y - offsetY + 5,
                                CARD_WIDTH - 10, 30, 5, 5);
            }
        }

        // Draw card count on top
        if (remainingCards > 0) {
            g2d.setColor(Color.WHITE);
            g2d.setFont(new Font("Arial", Font.BOLD, 14));
            String countText = remainingCards + " cards";
            FontMetrics fm = g2d.getFontMetrics();
            int textWidth = fm.stringWidth(countText);

            // Draw text background
            g2d.setColor(new Color(0, 0, 0, 150));
            g2d.fillRoundRect(x + (CARD_WIDTH - textWidth) / 2 - 5,
                            y + CARD_HEIGHT + 5,
                            textWidth + 10, 20, 5, 5);

            // Draw text
            g2d.setColor(Color.WHITE);
            g2d.drawString(countText,
                         x + (CARD_WIDTH - textWidth) / 2,
                         y + CARD_HEIGHT + 20);
        }
    }

    /**
     * Get the top position of the deck stack for animation purposes
     */
    public static Point getDeckTopPosition(int deckX, int deckY) {
        return new Point(deckX, deckY);
    }
}

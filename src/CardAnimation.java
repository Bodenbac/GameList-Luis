import java.awt.geom.Point2D;

/**
 * Handles smooth animation of card movement from one position to another
 */
public class CardAnimation {

    private Point2D.Double startPos;
    private Point2D.Double targetPos;
    private double startAngle;
    private double targetAngle;
    private long startTime;
    private int duration; // Animation duration in milliseconds
    private boolean completed;

    public CardAnimation(double startX, double startY, double targetX, double targetY,
                         double startAngle, double targetAngle, int duration) {
        this.startPos = new Point2D.Double(startX, startY);
        this.targetPos = new Point2D.Double(targetX, targetY);
        this.startAngle = startAngle;
        this.targetAngle = targetAngle;
        this.duration = duration;
        this.startTime = System.currentTimeMillis();
        this.completed = false;
    }

    /**
     * Get current position based on elapsed time
     * Uses easeOutCubic for smooth deceleration
     */
    public Point2D.Double getCurrentPosition() {
        if (completed) {
            return new Point2D.Double(targetPos.x, targetPos.y);
        }

        long elapsed = System.currentTimeMillis() - startTime;
        double progress = Math.min(1.0, (double) elapsed / duration);

        // Apply easing function
        double easedProgress = easeOutCubic(progress);

        double currentX = startPos.x + (targetPos.x - startPos.x) * easedProgress;
        double currentY = startPos.y + (targetPos.y - startPos.y) * easedProgress;

        if (progress >= 1.0) {
            completed = true;
        }

        return new Point2D.Double(currentX, currentY);
    }

    /**
     * Get current rotation angle based on elapsed time
     */
    public double getCurrentAngle() {
        if (completed) {
            return targetAngle;
        }

        long elapsed = System.currentTimeMillis() - startTime;
        double progress = Math.min(1.0, (double) elapsed / duration);
        double easedProgress = easeOutCubic(progress);

        return startAngle + (targetAngle - startAngle) * easedProgress;
    }

    /**
     * Check if animation is complete
     */
    public boolean isCompleted() {
        return completed;
    }

    /**
     * Get animation progress (0.0 to 1.0)
     */
    public double getProgress() {
        if (completed) return 1.0;

        long elapsed = System.currentTimeMillis() - startTime;
        return Math.min(1.0, (double) elapsed / duration);
    }

    /**
     * Easing function: ease out cubic
     * Starts fast, ends slow (like a card sliding into place)
     */
    private double easeOutCubic(double t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Force complete the animation immediately
     */
    public void complete() {
        this.completed = true;
    }
}

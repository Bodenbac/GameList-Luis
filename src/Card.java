import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

public class Card {

    public BufferedImage img;
    public final static int width = 100, height = 150;
    public final int type;
    public int value;
    public CardAnimation animation;
    public boolean isAnimating;

    public Card() throws IOException {
        this((int) (Math.random() * 13) + 1);
    }

    public Card(int cardType) throws IOException {

        this.type = cardType;
        this.animation = null;
        this.isAnimating = false;

        switch (this.type){

            case 1 : this.value = 11; this.img = ImageIO.read(new File("res/Cards/A.png")); break;
            case 2 : this.value = 2; this.img = ImageIO.read(new File("res/Cards/2.png")); break;
            case 3 : this.value = 3; this.img = ImageIO.read(new File("res/Cards/3.png")); break;
            case 4 : this.value = 4; this.img = ImageIO.read(new File("res/Cards/4.png")); break;
            case 5 : this.value = 5; this.img = ImageIO.read(new File("res/Cards/5.png")); break;
            case 6 : this.value = 6; this.img = ImageIO.read(new File("res/Cards/6.png")); break;
            case 7 : this.value = 7; this.img = ImageIO.read(new File("res/Cards/7.png")); break;
            case 8 : this.value = 8; this.img = ImageIO.read(new File("res/Cards/8.png")); break;
            case 9 : this.value = 9; this.img = ImageIO.read(new File("res/Cards/9.png")); break;
            case 10 : this.value = 10; this.img = ImageIO.read(new File("res/Cards/10.png")); break;
            case 11 : this.value = 10; this.img = ImageIO.read(new File("res/Cards/B.png")); break;
            case 12 : this.value = 10; this.img = ImageIO.read(new File("res/Cards/Q.png")); break;
            case 13 : this.value = 10; this.img = ImageIO.read(new File("res/Cards/K.png")); break;

        }

    }

    /**
     * Start animation for this card
     */
    public void startAnimation(double startX, double startY, double targetX, double targetY,
                               double startAngle, double targetAngle, int duration) {
        this.animation = new CardAnimation(startX, startY, targetX, targetY,
                                          startAngle, targetAngle, duration);
        this.isAnimating = true;
    }

    /**
     * Update animation state
     */
    public void updateAnimation() {
        if (animation != null && animation.isCompleted()) {
            isAnimating = false;
        }
    }

}

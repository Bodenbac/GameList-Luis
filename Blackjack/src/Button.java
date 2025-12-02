import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseEvent;

public class Button extends JButton {

    public static final int width = 100, height = 50;
    private final int x, y;

    Button(int x, int y, String text) {

        super(text);
        this.x = x;
        this.y = y;

        this.setOpaque(true);
        this.setBackground(Color.black);

    }

    public boolean isHovered() {
        Point mousePos = getMousePosition();
        return mousePos != null && getBounds().contains(mousePos);
    }

    public int getX(){return this.x;}
    public int getY(){return this.y;}
}
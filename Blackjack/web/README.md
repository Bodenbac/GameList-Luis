# 🎴 BlackJack - Modern Web Version

A beautiful, modern BlackJack game with stunning blue-green gradients, smooth animations, and professional casino-style gameplay.

---

## ✨ Features

### 🎨 Visual Design
- **Blue-Green Gradient Theme** - Professional, modern color scheme
- **Split Screen Layout** - Dealer on top, player on bottom
- **Animated Card Deck** - Floating 3D stack in the center
- **Smooth Animations** - Cards slide from deck to hands with easing
- **Responsive Design** - Works on desktop and mobile

### 🎴 Card Fanning
- **Player (n-form)** - Cards fan upward in arc
- **Dealer (u-form)** - Cards fan downward in arc (mirror effect)
- **Dynamic Spacing** - Adjusts based on number of cards
- **Smooth Rotation** - Cards rotate as they fan out

### 🎯 Gameplay
- **Full BlackJack Rules** - Proper scoring and ace handling
- **6-Deck Shoe** - 312 cards with auto-shuffling
- **Dealer AI** - Stands on 16+
- **Win/Loss/Push Detection** - Clear game outcomes
- **Beautiful Modals** - Result announcements with icons

### ⚡ Animations
- **Card Dealing** - Smooth slide from deck to hand
- **Fan Rearrangement** - Cards smoothly adjust positions
- **Score Updates** - Animated score badges with glow
- **Button Effects** - Hover and click animations

---

## 🚀 How to Run

### Option 1: Open Directly
Simply open the root `index.html` in a modern web browser:
```bash
cd /path/to/Blackjack
# Open in default browser (macOS)
open index.html
# Or drag index.html into your browser
```

### Option 2: Local Server (Recommended)
For best performance, use a local server from the repo root:

**Python:**
```bash
cd /path/to/Blackjack
python3 -m http.server 8000
# Open browser to: http://localhost:8000
```

**Node.js (with http-server):**
```bash
cd /path/to/Blackjack
npx http-server -p 8000
# Open browser to: http://localhost:8000
```

**VS Code Live Server:**
Right-click the root `index.html` → "Open with Live Server"

---

## 📁 File Structure

```
index.html            # Main HTML structure (root)
web/
├── styles.css        # Blue-green gradient theme & animations
├── deck.js           # Deck management (6-deck shoe)
├── cardRenderer.js   # Card rendering & fan animations
├── game.js           # Game logic & state management
└── README.md         # This file
assets/               # Icons, hearts, etc.
```

---

## 🎮 Controls

### Buttons
- **HIT** 🎴 - Draw another card
- **STAND** ✋ - End your turn
- **NEW GAME** 🔄 - Start fresh game

### Game Flow
1. Game starts with 2 cards dealt to each player
2. Player can HIT (draw cards) or STAND (hold)
3. If player stands, dealer plays automatically
4. Dealer draws until reaching 16+
5. Winner is determined and modal appears
6. Click "Play Again" to start new game

---

## 🎨 Design Details

### Color Scheme
```css
Primary Gradient: #1e3c72 → #2a5298 → #7dd3c0
Secondary Gradient: #0f2027 → #203a43 → #2c5364
Accent Green: #7dd3c0 (Player)
Accent Blue: #4a90e2 (Dealer)
```

### Layout
```
┌─────────────────────────────────┐
│     DEALER (Top 40%)            │
│       ◯ Score                   │
│      U-Form Fan                 │
│      ╲ ╲ │ ╱ ╱                 │
├─────────────────────────────────┤
│   MIDDLE (Center 20%)           │
│      [Deck Stack]               │
│   [HIT] [STAND] [NEW GAME]      │
├─────────────────────────────────┤
│     PLAYER (Bottom 40%)         │
│      ╱ ╱ │ ╲ ╲                 │
│      n-Form Fan                 │
│       ◯ Score                   │
└─────────────────────────────────┘
```

### Fan Formations

**Player (n-form) - Cards fan upward:**
```
    ╱ ╱ │ ╲ ╲      Center cards higher
   A  K  Q  J  10   Edge cards lower
```

**Dealer (u-form) - Cards fan downward:**
```
   A  K  Q  J  10   Edge cards higher
    ╲ ╲ │ ╱ ╱      Center cards lower
```

---

## 🔧 Technical Implementation

### Card Rendering
- **CSS Transforms** - Rotation and positioning
- **Dynamic Positioning** - Parabolic arc calculation
- **Z-Index Layering** - Cards stack properly
- **Smooth Transitions** - CSS cubic-bezier easing

### Animation System
- **Async/Await** - Sequential card dealing
- **Promise-based** - Clean animation timing
- **CSS Transitions** - Hardware-accelerated
- **Cubic-bezier Easing** - Smooth, natural motion

### Game Logic
- **State Machine** - INITIAL → DEALING → PLAYER_TURN → DEALER_TURN → GAME_OVER
- **Ace Handling** - Auto-adjusts 11 to 1 when over 21
- **Score Calculation** - Proper BlackJack rules
- **Deck Management** - 6-deck shoe with shuffling

---

## 📐 Fan Math

### Arc Calculation (Parabola)
```javascript
// Normalize position: -1 (left) to +1 (right)
normalizedPos = (2 * cardIndex / (totalCards - 1)) - 1

// Parabolic offset: max at center, 0 at edges
arcOffset = 20 * (1 - normalizedPos²)

// Player: center rises UP (negative Y)
// Dealer: center drops DOWN (positive Y)
y = isDealer ? arcOffset : -arcOffset
```

### Rotation Calculation
```javascript
maxAngle = min(45, totalCards * 8)
angleStep = maxAngle / (totalCards - 1)
rotation = -maxAngle/2 + (cardIndex * angleStep)
```

### Spacing
```javascript
cardSpacing = max(30, 55 - totalCards * 3)
// 2 cards: 49px
// 3 cards: 46px
// 5 cards: 40px
// 8+ cards: 30px
```

---

## 🎯 Game Rules

### Scoring
- **Number cards** (2-10): Face value
- **Face cards** (J, Q, K): 10 points
- **Ace**: 11 or 1 (auto-adjusted)

### Win Conditions
- **Player wins** if:
  - Player closer to 21 than dealer
  - Dealer busts (>21)
  - Player has blackjack (21 on initial 2 cards) and dealer doesn't

- **Dealer wins** if:
  - Dealer closer to 21 than player
  - Player busts (>21)
  - Dealer has blackjack and player doesn't

- **Push** (tie) if:
  - Both have same score

### Dealer Strategy
- Dealer **must** draw on 16 or less
- Dealer **must** stand on 17 or more

---

## 🌟 Features in Detail

### 1. Deck Stack Animation
- **5 layered cards** - 3D stacked appearance
- **Floating animation** - Gentle bobbing motion
- **Card count display** - Shows remaining cards
- **Auto-reshuffle** - When deck runs low

### 2. Score Badges
- **Circular design** - Modern UI
- **Glowing borders** - Green for player, blue for dealer
- **Pulse animation** - Subtle breathing effect
- **Large numbers** - Easy to read

### 3. Modal System
- **Animated entrance** - Scale and fade
- **Result icons** - 🎉 Win, 💥 Bust, 🤝 Push
- **Color-coded** - Green win, red lose, orange push
- **Backdrop blur** - Focus on result

### 4. Button Design
- **Gradient backgrounds** - Modern look
- **Icon + Text** - Clear labeling
- **Hover effects** - Lift and glow
- **Disabled state** - Grayed out when inactive

---

## 🎨 Customization

### Change Colors
Edit `styles.css` variables:
```css
:root {
    --primary-gradient: linear-gradient(135deg, #1e3c72 0%, #7dd3c0 100%);
    --accent-green: #7dd3c0;
    --accent-blue: #4a90e2;
}
```

### Adjust Fan Intensity
Edit `cardRenderer.js`:
```javascript
this.arcIntensity = 20; // Change to 30 for more dramatic arc
```

### Change Animation Speed
Edit `game.js`:
```javascript
await this.delay(400); // Change delay between card deals
```

Edit `cardRenderer.js`:
```javascript
cardEl.style.transition = 'all 0.6s...'; // Change animation duration
```

---

## 📊 Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- CSS Grid & Flexbox
- CSS Transforms & Transitions
- ES6+ JavaScript (Classes, Async/Await)

---

## 🐛 Troubleshooting

### Cards not appearing?
- Check browser console for errors
- Ensure all 4 files are in same directory
- Use a local server instead of file://

### Animations choppy?
- Close other tabs/applications
- Try a different browser
- Check GPU acceleration is enabled

### Layout broken on mobile?
- Rotate to landscape mode
- Try on tablet or desktop
- Check viewport meta tag in HTML

---

## 🚀 Performance

- **60 FPS** animations on modern devices
- **Minimal DOM** manipulation
- **Hardware-accelerated** CSS transforms
- **Lazy rendering** - Cards only created when needed
- **Efficient state management** - No unnecessary re-renders

---

## ✨ Future Enhancements

Possible additions:
- [ ] Betting system with chips
- [ ] Split pairs
- [ ] Double down
- [ ] Insurance
- [ ] Sound effects
- [ ] Multiple players
- [ ] Card counting trainer
- [ ] Statistics tracking
- [ ] Leaderboard
- [ ] Multiplayer

---

## 🎉 Credits

**Ported from:** Java Swing BlackJack game
**Design:** Modern blue-green gradient theme
**Animation:** Custom CSS & JavaScript
**Fan Algorithm:** Parabolic arc with dynamic spacing

---

## 📝 License

Educational project - Free to use and modify

---

**Enjoy the game!** 🎴✨

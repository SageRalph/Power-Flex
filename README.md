# ⚡ POWER FLEX ⚡

A client-side web-based educational card game where you balance and decarbonise a growing power grid without causing instability.

## 🎮 How to Play

### Goal
Replace all fossil fuel generators with sustainable power sources (Wind, Solar, Tidal, Hydro, Nuclear) while maintaining grid stability.

### Game Setup
- **GRID**: Contains 8 Generator slots (4 start with Fossil generators) and 8 Consumer slots (4 start with random consumers)
- **SHOP**: Contains all available cards to purchase and place
- **Balance**: All values (Night, Day, Eve, Flex) must stay ≥ 0

### Each Turn
1. **Automatic**: A new random Consumer is placed in an empty Consumer slot (if available)
2. **Automatic**: Any face-down Big Generators are flipped face-up and become active
3. **Your Choice**: Play one card from the Shop (if placement keeps all balance values ≥ 0)

### Card Types
- **🔋 Generators**: Produce power, can be placed in any Generator slot
- **🏗️ Big Generators**: Powerful generators placed face-down, activate next turn
- **🏠 Consumers**: Use power, new ones revealed each turn
- **💡 Incentives**: Replace existing Consumers to make them more efficient or flexible or move load off-peak

### Win Condition
- **🏆 Remove all Fossil generators from the grid

## 🚀 Running the Game

### Option 1: Open directly in browser
Open `index.html` in any modern web browser.

### Option 2: Local server (recommended)
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```
Then open `http://localhost:8000` in your browser.

## 🎯 Strategy Tips

1. **Plan Ahead**: Big Generators take a turn to activate, so plan your grid carefully
2. **Balance is Key**: Watch all four balance values - you can't play cards that would make any go negative!
3. **Diversify**: Different generators excel at different times (Day/Night/Evening)
4. **Use Incentives**: Replace inefficient consumers with smart alternatives
5. **Flexibility Matters**: Some cards provide Flex points which help stabilize the grid

## 🛠️ Technical Details

- **Pure Client-Side**: HTML, CSS, and vanilla JavaScript
- **No Dependencies**: Runs in any modern browser
- **Responsive Design**: Works on desktop and mobile devices

Enjoy balancing your power grid! 🌱⚡

// Game Configuration
const CONFIG = {
    GRID_SIZE: 8,
    INITIAL_FOSSIL_COUNT: 4,
    INITIAL_REVEALED_CONSUMERS: 4,
    STAT_TYPES: ['night', 'day', 'eve', 'flex']
};

/**
 * Create a stat row DOM element for a card
 * @param {Object} card - Card data
 * @param {string} stat - Stat type (night, day, eve, flex)
 * @returns {HTMLElement} Stat row element
 */
function createStatRow(card, stat) {
    const statRow = document.createElement('div');
    statRow.className = 'stat-row';
    
    const label = document.createElement('span');
    label.className = 'stat-label';
    label.textContent = stat.charAt(0).toUpperCase() + stat.slice(1);
    
    const value = document.createElement('span');
    value.className = `stat-value ${card[stat] >= 0 ? 'positive' : 'negative'}`;
    value.textContent = card[stat] >= 0 ? `+${card[stat]}` : card[stat];
    
    statRow.appendChild(label);
    statRow.appendChild(value);
    
    return statRow;
}

// Card data from CSV
const cardData = [
    {name: "Solar", type: "Generator", night: 1, day: 4, eve: 1, flex: -1},
    {name: "Wind", type: "Generator", night: 2, day: 1, eve: 3, flex: -1},
    {name: "Tidal", type: "Generator", night: 3, day: 0, eve: 3, flex: 0},
    {name: "Fossil", type: "Generator", night: 2, day: 2, eve: 2, flex: 1},
    {name: "Hydro", type: "Big Generator", night: 2, day: 2, eve: 2, flex: 2},
    {name: "Nuclear", type: "Big Generator", night: 3, day: 3, eve: 3, flex: 0},
    {name: "AC", type: "Consumer", night: 0, day: -2, eve: -1, flex: 0},
    {name: "Industry", type: "Consumer", night: 0, day: -3, eve: -2, flex: -2},
    {name: "EVs", type: "Consumer", night: -1, day: 0, eve: -1, flex: 0},
    {name: "Appliances", type: "Consumer", night: 0, day: -1, eve: -3, flex: 0},
    {name: "Lights", type: "Consumer", night: -1, day: -1, eve: -2, flex: 0},
    {name: "Heating", type: "Consumer", night: -1, day: 0, eve: -2, flex: 0},
    {name: "Infrastructure", type: "Consumer", night: -1, day: -1, eve: -2, flex: 0},
    {name: "Data Centre", type: "Consumer", night: -1, day: -2, eve: -2, flex: 0},
    {name: "Adaptive Servers", type: "Incentive", night: -2, day: -2, eve: -1, flex: 1},
    {name: "Smart Grid", type: "Incentive", night: -1, day: 0, eve: 0, flex: 1},
    {name: "Smart Appliances", type: "Incentive", night: -1, day: -1, eve: -1, flex: 0},
    {name: "Smart Industry", type: "Incentive", night: -2, day: -2, eve: -1, flex: -2},
    {name: "Smart EVs", type: "Incentive", night: -2, day: 0, eve: 0, flex: 1},
    {name: "LED Lights", type: "Incentive", night: -1, day: 0, eve: -1, flex: 0},
    {name: "Heat Pumps", type: "Incentive", night: -1, day: 0, eve: -1, flex: 1},
    {name: "Passive Cooling", type: "Incentive", night: 0, day: -1, eve: -1, flex: 0}
];

// Incentive to Consumer mapping
const INCENTIVE_MAP = {
    "Adaptive Servers": "Data Centre",
    "Smart Grid": "Infrastructure", 
    "Smart Appliances": "Appliances",
    "Smart Industry": "Industry",
    "Smart EVs": "EVs",
    "LED Lights": "Lights",
    "Heat Pumps": "Heating",
    "Passive Cooling": "AC"
};

// Helper function to get matching consumer type for incentives
function getMatchingConsumerType(incentiveName) {
    return INCENTIVE_MAP[incentiveName] || null;
}

/**
 * Check if a card can be placed anywhere on the grid without causing instability
 * @param {Object} card - The card to check placement for
 * @returns {boolean} True if card can be placed somewhere, false otherwise
 */
function canCardBePlacedAnywhere(card) {
    if (card.type === "Generator" || card.type === "Big Generator") {
        // Check all generator slots - generators can go in empty slots or replace different generators
        for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
            const existingCard = gameState.generators[i];
            // Can place if slot is empty OR has a different generator type
            if ((!existingCard || existingCard.name !== card.name) && canPlaceCard(card, 'generator', i)) {
                return true;
            }
        }
    } else if (card.type === "Incentive") {
        // Check all consumer slots for matching type
        const matchingConsumerType = getMatchingConsumerType(card.name);
        for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
            const consumer = gameState.consumers[i];
            if (consumer && consumer.name === matchingConsumerType && canPlaceCard(card, 'consumer', i)) {
                return true;
            }
        }
    }
    return false;
}

// Game state
let gameState = {
    turn: 1,
    generators: new Array(CONFIG.GRID_SIZE).fill(null),
    consumers: new Array(CONFIG.GRID_SIZE).fill(null),
    shop: [],
    selectedCard: null,
    gameWon: false,
    usedConsumers: new Set()
};

/**
 * Initialize the game state and set up initial cards
 */
function initGame() {
    try {
        gameState = {
            turn: 1,
            generators: new Array(CONFIG.GRID_SIZE).fill(null),
            consumers: new Array(CONFIG.GRID_SIZE).fill(null),
            shop: [],
            selectedCard: null,
            gameWon: false,
            usedConsumers: new Set()
        };

    // Place initial fossil generators
    for (let i = 0; i < CONFIG.INITIAL_FOSSIL_COUNT; i++) {
        gameState.generators[i] = {
            ...cardData.find(card => card.name === "Fossil"),
            id: `fossil-${i}`
        };
    }

    // Pre-determine all 8 consumers at game start
    const consumerCards = cardData.filter(card => card.type === "Consumer");
    const shuffledConsumers = [...consumerCards].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
        if (i < shuffledConsumers.length) {
            gameState.consumers[i] = {
                ...shuffledConsumers[i],
                id: `consumer-${i}`,
                faceDown: i >= CONFIG.INITIAL_REVEALED_CONSUMERS // First 4 are revealed, rest are face-down
            };
            gameState.usedConsumers.add(shuffledConsumers[i].name);
        }
    }

        // Initialize shop with all generators (including fossil), big generators, and available incentives
        updateShopInventory();

        updateDisplay();
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}

// Update shop inventory based on current grid state
function updateShopInventory() {
    // Get all consumer types currently on the grid
    const availableConsumerTypes = new Set();
    gameState.consumers.forEach(consumer => {
        if (consumer && consumer.type === "Consumer") {
            availableConsumerTypes.add(consumer.name);
        }
    });
    
    // Clear shop and rebuild
    gameState.shop = [];
    cardData.forEach((card, index) => {
        if (card.type !== "Consumer") {
            // For incentives, only add if there's a matching consumer on the grid
            if (card.type === "Incentive") {
                const matchingConsumer = getMatchingConsumerType(card.name);
                if (matchingConsumer && availableConsumerTypes.has(matchingConsumer)) {
                    gameState.shop.push({
                        ...card,
                        id: `shop-${index}`
                    });
                }
            } else {
                // Always add generators, big generators, and fossil generators
                gameState.shop.push({
                    ...card,
                    id: `shop-${index}`
                });
            }
        }
    });
}

/**
 * Create a DOM element for a card with all styling and event listeners
 * @param {Object} card - Card data object
 * @param {boolean} isShop - Whether this card is in the shop (adds interactions)
 * @param {boolean} isFaceDown - Whether to show card face-down
 * @returns {HTMLElement} Complete card DOM element
 */
function createCardElement(card, isShop = false, isFaceDown = false) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card ${card.type.toLowerCase().replace(' ', '-')}`;
    cardDiv.dataset.cardId = card.id;
    
    if (card.name === "Fossil") {
        cardDiv.classList.add('fossil');
    }
    
    if (isFaceDown) {
        cardDiv.classList.add('face-down');
    }

    if (isShop) {
        // Check if card can be placed anywhere
        if (!canCardBePlacedAnywhere(card)) {
            cardDiv.classList.add('unselectable');
        }
        
        try {
            if (card.type === "Incentive") {
                // For incentives, add hover effects and immediate play
                cardDiv.addEventListener('mouseenter', () => showIncentiveHover(card));
                cardDiv.addEventListener('mouseleave', () => clearIncentiveHover(card));
                cardDiv.addEventListener('click', () => {
                    console.log('Incentive card clicked:', card.name);
                    playIncentiveImmediately(card);
                });
            } else {
                // For generators, add hover effects and normal selection
                cardDiv.addEventListener('mouseenter', () => showGeneratorHover(card));
                cardDiv.addEventListener('mouseleave', () => clearGeneratorHover(card));
                cardDiv.addEventListener('click', () => {
                    console.log('Generator card clicked:', card.name);
                    selectCard(card);
                });
            }
        } catch (error) {
            console.error('Error adding event listeners to card:', error);
        }
    }

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = card.name;
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'card-type';
    typeDiv.textContent = card.type;
    
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    
    const statsDiv = document.createElement('div');
    statsDiv.className = 'card-stats';
    
    // Create stat rows
    CONFIG.STAT_TYPES.forEach(stat => {
        statsDiv.appendChild(createStatRow(card, stat));
    });
    
    cardHeader.appendChild(nameDiv);
    cardHeader.appendChild(typeDiv);
    cardContent.appendChild(statsDiv);
    
    // Add "Next Turn" indicator for Big Generators in shop only
    if (card.type === "Big Generator" && !isFaceDown && isShop) {
        const nextTurnDiv = document.createElement('div');
        nextTurnDiv.className = 'next-turn-indicator';
        nextTurnDiv.textContent = 'Next Turn';
        cardContent.appendChild(nextTurnDiv);
    }
    
    cardDiv.appendChild(cardHeader);
    cardDiv.appendChild(cardContent);
    
    return cardDiv;
}

/**
 * Select a card from the shop for placement
 * @param {Object} card - Card to select
 */
function selectCard(card) {
    console.log('Attempting to select card:', card.name, card.type);
    
    // Check if this card can be placed anywhere without making grid unstable
    if (!canCardBePlacedAnywhere(card)) {
        console.log('Card cannot be placed anywhere:', card.name);
        updateGameStatus(`Cannot select ${card.name} - would make grid unstable!`);
        return;
    }
    
    console.log('Card can be placed, proceeding with selection');
    
    // Clear previous selection
    document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    
    gameState.selectedCard = card;
    // Only select shop cards, not grid cards
    const shopCard = document.querySelector(`#generator-shop [data-card-id="${card.id}"], #incentive-shop [data-card-id="${card.id}"]`);
    if (shopCard) {
        shopCard.classList.add('selected');
        console.log('Shop card selected and highlighted');
    } else {
        console.log('Could not find shop card to highlight');
    }
    
    // Show valid drop zones
    showValidDropZones(card);
    updateGameStatus(`Selected ${card.name}. Click a valid slot to place it.`);
}

// Show valid drop zones
function showValidDropZones(card) {
    // Clear previous highlighting
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.classList.remove('valid-drop', 'invalid-drop');
        // Remove existing hover listeners
        slot.onmouseenter = null;
        slot.onmouseleave = null;
    });

    if (card.type === "Generator" || card.type === "Big Generator") {
        // Show projections for all generator slots
        document.querySelectorAll('.generator-slot').forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slot);
            const existingCard = gameState.generators[slotIndex];
            
            console.log(`Checking generator slot ${slotIndex}, existing:`, existingCard?.name, 'placing:', card.name);
            
            // Skip slots with same generator type entirely
            if (existingCard && existingCard.name === card.name) {
                console.log(`Skipping same type generator in slot ${slotIndex}`);
                return; // Don't process same-type generators at all
            }
            
            const canPlace = canPlaceCard(card, 'generator', slotIndex);
            console.log(`Slot ${slotIndex} canPlace:`, canPlace);
            
            if (canPlace) {
                slot.classList.add('valid-drop');
            } else {
                slot.classList.add('invalid-drop');
            }
            
            // Add hover projection for all slots that have generators
            slot.onmouseenter = () => showProjection(card, 'generator', slotIndex, canPlace);
            slot.onmouseleave = () => clearProjection();
        });
    } else if (card.type === "Incentive") {
        // Show projections for all consumer slots
        const matchingConsumerType = getMatchingConsumerType(card.name);
        document.querySelectorAll('.consumer-slot').forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slot);
            const consumer = gameState.consumers[slotIndex];
            const isMatchingType = consumer && consumer.name === matchingConsumerType;
            const canPlace = isMatchingType && canPlaceCard(card, 'consumer', slotIndex);
            
            if (canPlace) {
                slot.classList.add('valid-drop');
            } else {
                slot.classList.add('invalid-drop');
            }
            
            // Add hover projection for matching consumer slots
            if (isMatchingType) {
                slot.onmouseenter = () => showProjection(card, 'consumer', slotIndex, canPlace);
                slot.onmouseleave = () => clearProjection();
            }
        });
    }
}

/**
 * Check if a specific card can be placed in a specific slot
 * @param {Object} card - Card to place
 * @param {string} slotType - 'generator' or 'consumer'
 * @param {number} slotIndex - Index of the slot
 * @returns {boolean} True if placement is valid
 */
function canPlaceCard(card, slotType, slotIndex) {
    if (!card || slotIndex < 0 || slotIndex >= CONFIG.GRID_SIZE) {
        return false;
    }

    // Check if trying to replace a card with itself
    if (slotType === 'generator') {
        const existingCard = gameState.generators[slotIndex];
        if (existingCard && existingCard.name === card.name) {
            return false; // Can't replace with same card type
        }
    } else if (slotType === 'consumer' && card.type === "Incentive") {
        const existingCard = gameState.consumers[slotIndex];
        if (existingCard && existingCard.name === card.name) {
            return false; // Can't replace incentive with same incentive
        }
    }

    // Create a temporary game state to test the placement
    const tempState = JSON.parse(JSON.stringify(gameState));
    
    if (slotType === 'generator') {
        if (card.type === "Big Generator") {
            // Big generators are placed face-down and don't contribute this turn
            tempState.generators[slotIndex] = { ...card, faceDown: true };
        } else {
            // Regular generators contribute immediately
            tempState.generators[slotIndex] = card;
        }
    } else if (slotType === 'consumer') {
        if (card.type === "Incentive") {
            const existingConsumer = tempState.consumers[slotIndex];
            if (!existingConsumer) {
                return false; // Can't place incentive on empty slot
            }
            const matchingConsumerType = getMatchingConsumerType(card.name);
            if (existingConsumer.name !== matchingConsumerType) {
                return false; // Can only place incentive on matching consumer type
            }
        }
        tempState.consumers[slotIndex] = card;
    }

    // Calculate totals with the new placement (face-down generators don't contribute)
    const totals = calculateTotals(tempState);
    
    // Check if all totals are >= 0
    return totals.night >= 0 && totals.day >= 0 && totals.eve >= 0 && totals.flex >= 0;
}

// Calculate grid totals
function calculateTotals(state = gameState) {
    const totals = { night: 0, day: 0, eve: 0, flex: 0 };
    
    // Add generator contributions (skip face-down generators)
    state.generators.forEach(generator => {
        if (generator && !generator.faceDown) {
            totals.night += generator.night;
            totals.day += generator.day;
            totals.eve += generator.eve;
            totals.flex += generator.flex;
        }
    });
    
    // Add consumer contributions (negative) - skip face-down consumers
    state.consumers.forEach(consumer => {
        if (consumer && !consumer.faceDown) {
            totals.night += consumer.night;
            totals.day += consumer.day;
            totals.eve += consumer.eve;
            totals.flex += consumer.flex;
        }
    });
    
    return totals;
}

// Show projection for placing a card in a specific slot
function showProjection(card, slotType, slotIndex, isValidPlacement = true) {
    if (!card) {
        clearProjection();
        return;
    }

    const currentTotals = calculateTotals();
    const tempState = JSON.parse(JSON.stringify(gameState));
    
    // Apply the hypothetical placement
    if (slotType === 'generator') {
        tempState.generators[slotIndex] = card;
    } else if (slotType === 'consumer') {
        tempState.consumers[slotIndex] = card;
    }
    
    const newTotals = calculateTotals(tempState);
    const changes = {
        night: newTotals.night - currentTotals.night,
        day: newTotals.day - currentTotals.day,
        eve: newTotals.eve - currentTotals.eve,
        flex: newTotals.flex - currentTotals.flex
    };
    
    // Update projection display
    ['night', 'day', 'eve', 'flex'].forEach(stat => {
        const newValueElement = document.getElementById(`${stat}-new`);
        const newValue = newTotals[stat];
        
        // Always ensure element has content, just change visibility
        newValueElement.textContent = newValue;
        let valueClass = 'new-value show ';
        
        if (newValue < 0) {
            valueClass += 'invalid';
        } else if (newValue > currentTotals[stat]) {
            valueClass += 'positive';
        } else if (newValue < currentTotals[stat]) {
            valueClass += 'negative';
        } else {
            valueClass += 'neutral';
        }
        
        newValueElement.className = valueClass;
    });
}

// Clear projection display
function clearProjection() {
    ['night', 'day', 'eve', 'flex'].forEach(stat => {
        const newValueElement = document.getElementById(`${stat}-new`);
        
        newValueElement.className = 'new-value';
    });
}

// Show hover effect for generator cards
function showGeneratorHover(card) {
    if (card.type === "Incentive") return;
    
    // Clear all existing highlights first (except incentive-target)
    document.querySelectorAll('.generator-slot').forEach(slot => {
        slot.classList.remove('valid-drop', 'invalid-drop');
    });
    
    // Highlight all generator slots where this card can be placed (same logic as selection)
    document.querySelectorAll('.generator-slot').forEach(slot => {
        const slotIndex = parseInt(slot.dataset.slot);
        const existingCard = gameState.generators[slotIndex];
        
        // Skip slots with same generator type entirely
        if (existingCard && existingCard.name === card.name) {
            return; // Don't process same-type generators at all
        }
        
        const canPlace = canPlaceCard(card, 'generator', slotIndex);
        
        if (canPlace) {
            slot.classList.add('valid-drop');
        } else {
            slot.classList.add('invalid-drop');
        }
    });
}

// Clear hover effect for generator cards
function clearGeneratorHover(card) {
    if (card.type === "Incentive") return;
    
    // Don't clear highlighting if this card is currently selected
    if (gameState.selectedCard && gameState.selectedCard.id === card.id) {
        return;
    }
    
    // Remove highlight from all generator slots
    document.querySelectorAll('.generator-slot').forEach(slot => {
        slot.classList.remove('valid-drop', 'invalid-drop');
    });
    
    // If there's a different selected card, restore its highlighting
    if (gameState.selectedCard && gameState.selectedCard.type !== "Incentive") {
        showValidDropZones(gameState.selectedCard);
    }
}

// Show hover effect for incentive cards
function showIncentiveHover(card) {
    if (card.type !== "Incentive") return;
    
    const matchingConsumerType = getMatchingConsumerType(card.name);
    if (!matchingConsumerType) return;
    
    // Clear existing generator highlights first
    document.querySelectorAll('.generator-slot').forEach(slot => {
        slot.classList.remove('valid-drop', 'invalid-drop');
    });
    
    // Find the slot with the matching consumer
    let targetSlot = -1;
    for (let i = 0; i < gameState.consumers.length; i++) {
        const consumer = gameState.consumers[i];
        if (consumer && consumer.name === matchingConsumerType) {
            targetSlot = i;
            break;
        }
    }
    
    if (targetSlot === -1) return;
    
    // Highlight the target card
    const slotElement = document.querySelector(`[data-slot="${targetSlot}"].consumer-slot`);
    if (slotElement) {
        slotElement.classList.add('incentive-target');
    }
    
    // Show projection for this placement
    const canPlace = canPlaceCard(card, 'consumer', targetSlot);
    showProjection(card, 'consumer', targetSlot, canPlace);
}

// Clear hover effect for incentive cards
function clearIncentiveHover(card) {
    if (card.type !== "Incentive") return;
    
    // Don't clear highlighting if this card is currently selected
    if (gameState.selectedCard && gameState.selectedCard.id === card.id) {
        return;
    }
    
    // Remove highlight from all slots
    document.querySelectorAll('.consumer-slot').forEach(slot => {
        slot.classList.remove('incentive-target');
    });
    
    // Clear projection
    clearProjection();
    
    // If there's a different selected card, restore its highlighting
    if (gameState.selectedCard) {
        showValidDropZones(gameState.selectedCard);
    }
}

// Play incentive card immediately
function playIncentiveImmediately(card) {
    if (card.type !== "Incentive") return;
    
    // Check if card can be placed anywhere
    if (!canCardBePlacedAnywhere(card)) {
        updateGameStatus(`Cannot play ${card.name} - would make grid unstable!`);
        return;
    }
    
    const matchingConsumerType = getMatchingConsumerType(card.name);
    if (!matchingConsumerType) return;
    
    // Find the slot with the matching consumer
    let targetSlot = -1;
    for (let i = 0; i < gameState.consumers.length; i++) {
        const consumer = gameState.consumers[i];
        if (consumer && consumer.name === matchingConsumerType) {
            targetSlot = i;
            break;
        }
    }
    
    if (targetSlot === -1) {
        updateGameStatus(`No ${matchingConsumerType} found on grid!`);
        return;
    }
    
    // Check if placement is valid
    if (!canPlaceCard(card, 'consumer', targetSlot)) {
        updateGameStatus(`Cannot place ${card.name} - would make grid unstable!`);
        return;
    }
    
    // Place the card
    gameState.consumers[targetSlot] = card;
    
    // Remove card from shop
    gameState.shop = gameState.shop.filter(c => c.id !== card.id);
    
    // Clear any selected card and its highlighting
    if (gameState.selectedCard) {
        gameState.selectedCard = null;
        document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.classList.remove('valid-drop', 'invalid-drop', 'incentive-target');
            slot.onmouseenter = null;
            slot.onmouseleave = null;
        });
    }
    
    // Clear any hover effects
    clearIncentiveHover(card);
    
    updateShopInventory();
    updateDisplay();
    checkWinCondition();
    
    if (!gameState.gameWon) {
        updateGameStatus("Incentive played! Advancing to next turn...");
        // Automatically advance to next turn after a short delay
        setTimeout(() => {
            nextTurn();
        }, 1000);
    }
}

// Place card in slot
function placeCard(slotType, slotIndex) {
    if (!gameState.selectedCard) return;
    
    const card = gameState.selectedCard;
    
    if (!canPlaceCard(card, slotType, slotIndex)) {
        updateGameStatus("Invalid placement! This would make the grid unstable.");
        return;
    }
    
    if (slotType === 'generator') {
        if (card.type === "Big Generator") {
            // Place big generators face-down (they activate next turn)
            gameState.generators[slotIndex] = { ...card, faceDown: true };
        } else {
            // Place regular generators normally
            gameState.generators[slotIndex] = card;
        }
    } else if (slotType === 'consumer' && card.type === "Incentive") {
        const existingConsumer = gameState.consumers[slotIndex];
        const matchingConsumerType = getMatchingConsumerType(card.name);
        if (!existingConsumer || existingConsumer.name !== matchingConsumerType) {
            updateGameStatus(`${card.name} can only be placed on ${matchingConsumerType}!`);
            return;
        }
        gameState.consumers[slotIndex] = card;
    }
    
    // Remove card from shop
    gameState.shop = gameState.shop.filter(c => c.id !== card.id);
    gameState.selectedCard = null;
    
    // Clear highlighting and projections
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.classList.remove('valid-drop', 'invalid-drop');
        slot.onmouseenter = null;
        slot.onmouseleave = null;
    });
    document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    clearProjection();
    
    updateShopInventory();
    updateDisplay();
    checkWinCondition();
    
    if (!gameState.gameWon) {
        updateGameStatus("Card placed! Advancing to next turn...");
        // Automatically advance to next turn after a short delay
        setTimeout(() => {
            nextTurn();
        }, 1000);
    }
}

// Add event listeners to slots
function addSlotListeners() {
    document.querySelectorAll('.generator-slot').forEach((slot, index) => {
        slot.addEventListener('click', () => {
            console.log('Generator slot clicked:', index, 'Selected card:', gameState.selectedCard?.name);
            if (gameState.selectedCard && 
                (gameState.selectedCard.type === "Generator" || gameState.selectedCard.type === "Big Generator")) {
                console.log('Attempting to place generator in slot:', index);
                placeCard('generator', index);
            } else {
                console.log('No valid generator selected for placement');
            }
        });
    });
    
    document.querySelectorAll('.consumer-slot').forEach((slot, index) => {
        slot.addEventListener('click', () => {
            console.log('Consumer slot clicked:', index, 'Selected card:', gameState.selectedCard?.name);
            if (gameState.selectedCard && gameState.selectedCard.type === "Incentive") {
                placeCard('consumer', index);
            }
        });
    });
}

// Update display
function updateDisplay() {
    updateGrid();
    updateShop();
    updateTotals();
    updateTurnCounter();
}

// Update grid display
function updateGrid() {
    // Update generators
    document.querySelectorAll('.generator-slot').forEach((slot, index) => {
        slot.innerHTML = '';
        if (gameState.generators[index]) {
            const cardElement = createCardElement(
                gameState.generators[index], 
                false, 
                gameState.generators[index].faceDown
            );
            slot.appendChild(cardElement);
        }
    });
    
    // Update consumers
    document.querySelectorAll('.consumer-slot').forEach((slot, index) => {
        slot.innerHTML = '';
        if (gameState.consumers[index]) {
            const consumer = gameState.consumers[index];
            const cardElement = createCardElement(consumer, false, consumer.faceDown);
            if (consumer.faceDown) {
                cardElement.classList.add('empty-consumer');
                const revealAfterTurn = index - 3;
                cardElement.dataset.revealTurn = revealAfterTurn;
            }
            slot.appendChild(cardElement);
        }
    });
}

// Update shop display
function updateShop() {
    const generatorShop = document.getElementById('generator-shop');
    const incentiveShop = document.getElementById('incentive-shop');
    
    generatorShop.innerHTML = '';
    incentiveShop.innerHTML = '';
    
    // Create shop slots for generators (up to 8 slots)
    for (let i = 0; i < 8; i++) {
        const shopSlot = document.createElement('div');
        shopSlot.className = 'shop-slot';
        generatorShop.appendChild(shopSlot);
    }
    
    // Create shop slots for incentives (up to 8 slots)
    for (let i = 0; i < 8; i++) {
        const shopSlot = document.createElement('div');
        shopSlot.className = 'shop-slot';
        incentiveShop.appendChild(shopSlot);
    }
    
    // Add generators to slots
    let generatorIndex = 0;
    gameState.shop.forEach(card => {
        if (card.type === "Generator" || card.type === "Big Generator") {
            if (generatorIndex < 8) {
                const cardElement = createCardElement(card, true);
                generatorShop.children[generatorIndex].appendChild(cardElement);
                generatorIndex++;
            }
        }
    });
    
    // Add incentives in the same order as their consumers appear on the grid
    let incentiveIndex = 0;
    
    // Process all consumer slots (0-7) to maintain consistent order
    for (let i = 0; i < 8 && incentiveIndex < 8; i++) {
        const consumer = gameState.consumers[i];
        
        if (consumer && consumer.type === "Consumer") {
            if (consumer.faceDown) {
                // Show the actual incentive face-down if consumer is face-down
                // Find matching incentive for this consumer type
                const incentiveName = Object.keys(INCENTIVE_MAP).find(key => INCENTIVE_MAP[key] === consumer.name);
                
                if (incentiveName) {
                    
                    const incentiveData = cardData.find(card => card.name === incentiveName);
                    if (incentiveData) {
                        const faceDownIncentive = {
                            ...incentiveData,
                            id: `incentive-facedown-${i}`
                        };
                        const cardElement = createCardElement(faceDownIncentive, false, true);
                        cardElement.classList.add('empty-incentive');
                        const revealAfterTurn = i - 3;
                        cardElement.dataset.revealTurn = revealAfterTurn;
                        incentiveShop.children[incentiveIndex].appendChild(cardElement);
                    }
                }
            } else {
                // Find matching incentive in shop for revealed consumer
                const matchingIncentive = gameState.shop.find(card => {
                    if (card.type === "Incentive") {
                        const matchingConsumerType = getMatchingConsumerType(card.name);
                        return matchingConsumerType === consumer.name;
                    }
                    return false;
                });
                
                if (matchingIncentive) {
                    const cardElement = createCardElement(matchingIncentive, true);
                    incentiveShop.children[incentiveIndex].appendChild(cardElement);
                }
            }
        }
        incentiveIndex++;
    }
}

// Update totals display
function updateTotals() {
    const totals = calculateTotals();
    
    document.getElementById('night-total').textContent = totals.night;
    document.getElementById('day-total').textContent = totals.day;
    document.getElementById('eve-total').textContent = totals.eve;
    document.getElementById('flex-total').textContent = totals.flex;
    
    // Initialize projection elements with placeholder content if empty
    ['night', 'day', 'eve', 'flex'].forEach(stat => {
        const newValueElement = document.getElementById(`${stat}-new`);
        if (!newValueElement.textContent) {
            newValueElement.textContent = '0';
            newValueElement.className = 'new-value';
        }
    });
    
    // Update color based on value
    ['night', 'day', 'eve', 'flex'].forEach(stat => {
        const element = document.getElementById(`${stat}-total`);
        element.className = 'value';
        if (totals[stat] > 0) {
            element.classList.add('positive');
        } else if (totals[stat] < 0) {
            element.classList.add('negative');
        }
    });
}

// Update turn counter (removed UI element, keeping function to prevent errors)
function updateTurnCounter() {
    // Turn counter no longer displayed in UI
    console.log('Current Turn:', gameState.turn);
}

// Update game status (removed UI element, keeping function to prevent errors)
function updateGameStatus(message) {
    // Status messages no longer displayed in UI
    console.log('Game Status:', message);
}

// Check win condition
function checkWinCondition() {
    const hasFossil = gameState.generators.some(gen => gen && gen.name === "Fossil");
    if (!hasFossil) {
        gameState.gameWon = true;
        showWinModal();
    }
}

// Show win modal
function showWinModal() {
    document.getElementById('final-score').textContent = gameState.turn;
    document.getElementById('win-modal').classList.remove('hidden');
}

// Show game over modal
function showGameOverModal() {
    document.getElementById('game-over-modal').classList.remove('hidden');
}



// Next turn
function nextTurn() {
    if (gameState.gameWon) return;
    
    gameState.turn++;
    
    // 1. Reveal the next face-down consumer
    const nextFaceDownSlot = gameState.consumers.findIndex(consumer => consumer && consumer.faceDown);
    
    if (nextFaceDownSlot !== -1) {
        gameState.consumers[nextFaceDownSlot].faceDown = false;
        
        // Update shop inventory after revealing new consumer
        updateShopInventory();
    }
    
    // 2. Flip any face-down big generators (they now contribute to the grid)
    gameState.generators.forEach(generator => {
        if (generator && generator.faceDown) {
            generator.faceDown = false;
        }
    });
    
    updateDisplay();
    updateGameStatus("New turn started. Select a card from the shop to play.");
    checkWinCondition();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    addSlotListeners();
    
    document.getElementById('new-game-btn').addEventListener('click', initGame);
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('win-modal').classList.add('hidden');
        initGame();
    });
});
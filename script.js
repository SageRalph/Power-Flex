// Game Configuration
const CONFIG = {
    GRID_SIZE: 8,
    INITIAL_FOSSIL_COUNT: 4,
    INITIAL_REVEALED_CONSUMERS: 4,
    STAT_TYPES: ['night', 'day', 'eve', 'flex']
};

/**
 * Helper function to create DOM elements with class and content
 * @param {string} tagName - HTML tag name
 * @param {string} className - CSS class name
 * @param {string} textContent - Text content (optional)
 * @returns {HTMLElement} Created element
 */
function createElement(tagName, className, textContent = '') {
    const element = document.createElement(tagName);
    element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

/**
 * Create a stat row DOM element for a card
 * @param {Object} card - Card data
 * @param {string} stat - Stat type (night, day, eve, flex)
 * @returns {HTMLElement} Stat row element
 */
function createStatRow(card, stat) {
    const statRow = createElement('div', 'stat');
    const label = createElement('span', 'stat__label', stat.charAt(0).toUpperCase() + stat.slice(1));
    const value = createElement('span', `stat__value ${card[stat] >= 0 ? 'stat__value--positive' : 'stat__value--negative'}`, card[stat] >= 0 ? `+${card[stat]}` : card[stat]);
    
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

// Helper function to find consumer slot by type
function findConsumerSlotByType(consumerType) {
    for (let i = 0; i < gameState.consumers.length; i++) {
        const consumer = gameState.consumers[i];
        if (consumer && consumer.name === consumerType) {
            return i;
        }
    }
    return -1;
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
    gameWon: false,
    usedConsumers: new Set(),
    heldCard: null,
    heldCardElement: null
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
            gameWon: false,
            usedConsumers: new Set(),
            heldCard: null,
            heldCardElement: null
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
    cardDiv.className = `card card--${card.type.toLowerCase().replace(' ', '-')}`;
    cardDiv.dataset.cardId = card.id;
    
    if (card.name === "Fossil") {
        cardDiv.classList.add('card--fossil');
    }
    
    if (isFaceDown) {
        cardDiv.classList.add('card--under-construction');
    }

    if (isShop) {
        // Check if card can be placed anywhere
        if (!canCardBePlacedAnywhere(card)) {
            cardDiv.classList.add('card--disabled');
        }
        
        try {
            // Make card draggable only if not face-down and can be played
            if (!isFaceDown && canCardBePlacedAnywhere(card)) {
                cardDiv.draggable = true;
                cardDiv.setAttribute('data-card-data', JSON.stringify(card));
                
                // Add drag event handlers
                cardDiv.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(card));
                    e.dataTransfer.effectAllowed = 'move';
                    cardDiv.classList.add('card--dragging');
                    
                    // Hide the default drag image
                    const emptyImg = new Image();
                    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                    e.dataTransfer.setDragImage(emptyImg, 0, 0);
                    
                    // Create cursor-following element like held cards
                    const dragElement = cardDiv.cloneNode(true);
                    dragElement.classList.add('card--drag-following');
                    dragElement.style.position = 'fixed';
                    dragElement.style.left = '0';
                    dragElement.style.top = '0';
                    dragElement.style.zIndex = '10000';
                    dragElement.style.pointerEvents = 'none';
                    dragElement.style.opacity = '1';
                    dragElement.style.transform = 'scale(1.05)';
                    dragElement.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.4)';
                    document.body.appendChild(dragElement);
                    
                    // Store reference for cleanup
                    cardDiv._dragElement = dragElement;
                    
                    // Set initial position from dragstart coordinates
                    if (e.clientX && e.clientY) {
                        updateDragElementPosition(e);
                    }
                    
                    // Add global dragover listener for Firefox compatibility
                    document.addEventListener('dragover', updateDragElementPosition, true);
                    
                    console.log('Drag started:', card.name);
                });
                
                // Position tracking is handled by global dragover listener
                
                cardDiv.addEventListener('dragend', (e) => {
                    cardDiv.classList.remove('card--dragging');
                    
                    // Clean up drag following element
                    if (cardDiv._dragElement) {
                        cardDiv._dragElement.remove();
                        delete cardDiv._dragElement;
                    }
                    
                    // Remove global drag listeners
                    document.removeEventListener('dragover', updateDragElementPosition, true);
                    
                    console.log('Drag ended:', card.name);
                });
                
                // Add consolidated interaction handlers
                addCardInteractionHandlers(cardDiv, card);
            }
        } catch (error) {
            console.error('Error adding event listeners to card:', error);
        }
    }

    const cardHeader = createElement('div', 'card__header');
    const nameDiv = createElement('div', 'card__name', card.name);
    const typeDiv = createElement('div', 'card__type', card.type);
    const cardContent = createElement('div', 'card__content');
    const statsDiv = createElement('div', 'card__stats');
    
    // Create stat rows
    CONFIG.STAT_TYPES.forEach(stat => {
        statsDiv.appendChild(createStatRow(card, stat));
    });
    
    cardHeader.appendChild(nameDiv);
    cardHeader.appendChild(typeDiv);
    cardContent.appendChild(statsDiv);
    
    // Add "Next Turn" indicator for Big Generators in shop only
    if (card.type === "Big Generator" && !isFaceDown && isShop) {
        const nextTurnDiv = createElement('div', 'card__next-turn-indicator', 'Next Turn');
        cardContent.appendChild(nextTurnDiv);
    }
    
    cardDiv.appendChild(cardHeader);
    cardDiv.appendChild(cardContent);
    
    return cardDiv;
}

// selectCard function removed - cards are now placed via drag-drop and pickup only

// showValidDropZones function removed - visual feedback now handled by drag-drop and pickup hover events

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
    document.querySelectorAll('.slot--generator').forEach(slot => {
        slot.classList.remove('slot--valid-target', 'slot--invalid-target');
    });
    
    // Highlight all generator slots where this card can be placed (same logic as selection)
    document.querySelectorAll('.slot--generator').forEach(slot => {
        const slotIndex = parseInt(slot.dataset.slot);
        const existingCard = gameState.generators[slotIndex];
        
        // Skip slots with same generator type entirely
        if (existingCard && existingCard.name === card.name) {
            return; // Don't process same-type generators at all
        }
        
        const canPlace = canPlaceCard(card, 'generator', slotIndex);
        
        if (canPlace) {
            slot.classList.add('slot--valid-target');
        } else {
            slot.classList.add('slot--invalid-target');
        }
    });
}

// Clear hover effect for generator cards
function clearGeneratorHover(card) {
    if (card.type === "Incentive") return;
    
    // Remove highlight from all generator slots
    document.querySelectorAll('.slot--generator').forEach(slot => {
        slot.classList.remove('slot--valid-target', 'slot--invalid-target');
    });
}

// Show hover effect for incentive cards
function showIncentiveHover(card) {
    if (card.type !== "Incentive") return;
    
    const matchingConsumerType = getMatchingConsumerType(card.name);
    if (!matchingConsumerType) return;
    
    // Clear existing generator highlights first
    document.querySelectorAll('.slot--generator').forEach(slot => {
        slot.classList.remove('slot--valid-target', 'slot--invalid-target');
    });
    
    // Find the slot with the matching consumer
    const targetSlot = findConsumerSlotByType(matchingConsumerType);
    if (targetSlot === -1) return;
    
    // Highlight the target card
    const slotElement = document.querySelector(`[data-slot="${targetSlot}"].slot--consumer`);
    if (slotElement) {
        slotElement.classList.add('slot--incentive-target');
    }
    
    // Show projection for this placement
    const canPlace = canPlaceCard(card, 'consumer', targetSlot);
    showProjection(card, 'consumer', targetSlot, canPlace);
}

// Clear hover effect for incentive cards
function clearIncentiveHover(card) {
    if (card.type !== "Incentive") return;
    

    
    // Remove highlight from all slots
    document.querySelectorAll('.slot--consumer').forEach(slot => {
        slot.classList.remove('slot--incentive-target');
    });
    
    // Clear projection
    clearProjection();
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
    const targetSlot = findConsumerSlotByType(matchingConsumerType);
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
    
    // Clear any highlighting
    document.querySelectorAll('.card--selected').forEach(c => c.classList.remove('card--selected'));
    document.querySelectorAll('.slot').forEach(slot => {
        slot.classList.remove('slot--valid-target', 'slot--invalid-target', 'slot--incentive-target');
        slot.onmouseenter = null;
        slot.onmouseleave = null;
    });
    
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

// placeCard function removed - cards are now placed via drag-drop and pickup only

// Add event listeners to slots
function addSlotListeners() {
    // Generator slots
    document.querySelectorAll('.slot--generator').forEach((slot, index) => {
        // Click handlers
        slot.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Generator slot clicked:', index);
            
            if (gameState.heldCard && (gameState.heldCard.type === "Generator" || gameState.heldCard.type === "Big Generator")) {
                // Place held card
                if (canPlaceCard(gameState.heldCard, 'generator', index)) {
                    placeHeldCard('generator', index);
                }
            }
        });
        
        // Consolidated held card hover handlers  
        addHeldCardHoverHandlers(
            slot,
            index,
            (heldCard) => heldCard && (heldCard.type === "Generator" || heldCard.type === "Big Generator"),
            (heldCard, slotIndex, isEntering) => {
                if (isEntering) {
                    const canPlace = canPlaceCard(heldCard, 'generator', slotIndex);
                    showProjection(heldCard, 'generator', slotIndex, canPlace);
                } else {
                    clearProjection();
                }
            }
        );
        
        // Consolidated drag and drop handlers
        addDragHandlers(
            slot, 
            index, 
            'generator',
            (cardData) => cardData && (cardData.type === "Generator" || cardData.type === "Big Generator"),
            (cardData, slotIndex) => {
                if (canPlaceCard(cardData, 'generator', slotIndex)) {
                    handleCardPlacement(cardData, 'generator', slotIndex);
                }
            }
        );

    });
    
    // Consumer slots
    document.querySelectorAll('.slot--consumer').forEach((slot, index) => {
        // Click handlers
        slot.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Consumer slot clicked:', index);
            
            if (gameState.heldCard && gameState.heldCard.type === "Incentive") {
                // Place held card
                if (canPlaceCard(gameState.heldCard, 'consumer', index)) {
                    placeHeldCard('consumer', index);
                }
            }
        });
        
        // Consolidated drag and drop handlers
        addDragHandlers(
            slot,
            index,
            'consumer',
            (cardData) => cardData && cardData.type === "Incentive" && canIncentiveTargetSlot(cardData, index),
            (cardData, slotIndex) => {
                if (canIncentiveTargetSlot(cardData, slotIndex)) {
                    handleCardPlacement(cardData, 'consumer', slotIndex);
                    clearIncentiveHover(cardData);
                }
            }
        );
        
        // Consolidated held card hover handlers
        addHeldCardHoverHandlers(
            slot,
            index,
            (heldCard) => heldCard && heldCard.type === "Incentive",
            (heldCard, slotIndex, isEntering) => {
                const canPlace = canPlaceCard(heldCard, 'consumer', slotIndex);
                if (isEntering && canPlace) {
                    slot.classList.add('slot--incentive-target');
                } else if (!isEntering) {
                    slot.classList.remove('slot--incentive-target');
                }
            }
        );
    });
}

/**
 * Helper function to safely get dragged card data during drag events
 * @param {DragEvent} e - The drag event
 * @returns {Object|null} Card data or null if not available
 */
function getDraggedCardData(e) {
    try {
        // First try to get data from the drag event (works in drop events)
        if (e.dataTransfer && e.dataTransfer.types.includes('application/json')) {
            try {
                const data = e.dataTransfer.getData('application/json');
                if (data) return JSON.parse(data);
            } catch (dragError) {
                // Fall back to finding the dragging element
            }
        }
        
        // During dragenter/dragover, we can't access the actual data
        // but we can check what's being dragged by finding the dragging element
        const draggedElement = document.querySelector('.card--dragging');
        if (draggedElement && draggedElement.dataset.cardData) {
            return JSON.parse(draggedElement.dataset.cardData);
        }
        return null;
    } catch (error) {
        console.error('Error getting dragged card data:', error);
        return null;
    }
}

/**
 * Check if an incentive card can target a specific consumer slot
 * @param {Object} incentiveCard - The incentive card data
 * @param {number} slotIndex - The consumer slot index
 * @returns {boolean} Whether the incentive can target this slot
 */
function canIncentiveTargetSlot(incentiveCard, slotIndex) {
    // Use the existing canPlaceCard function which has all the validation logic
    return canPlaceCard(incentiveCard, 'consumer', slotIndex);
}

/**
 * Pick up a card to follow the cursor
 * @param {Object} card - The card data
 * @param {HTMLElement} cardElement - The card DOM element
 * @param {Event} event - The click event
 */
function pickUpCard(card, cardElement, event) {
    // If already holding a card, put it down first
    if (gameState.heldCard) {
        putDownHeldCard();
        return;
    }
    
    gameState.heldCard = card;
    
    // Add dragging class to original card for visual consistency
    cardElement.classList.add('card--dragging');
    
    // Clone the card element to follow cursor
    const heldElement = cardElement.cloneNode(true);
    heldElement.classList.add('card--held');
    heldElement.style.position = 'fixed';
    heldElement.style.left = '0';
    heldElement.style.top = '0';
    heldElement.style.zIndex = '1000'; // Match dragging z-index
    heldElement.style.pointerEvents = 'none';
    document.body.appendChild(heldElement);
    
    gameState.heldCardElement = heldElement;
    
    // Position at cursor
    updateHeldCardPosition(event);
    
    // Add global mouse move and click listeners
    document.addEventListener('mousemove', updateHeldCardPosition);
    document.addEventListener('click', handleHeldCardClick);
    
    // Show hover effects for valid targets (global highlighting)
    if (card.type === "Incentive") {
        showIncentiveHover(card);
    } else {
        showGeneratorHover(card);
    }
    
    console.log('Global highlighting applied for held card');
    
    console.log('Picked up card:', card.name);
}

/**
 * Update held card position to follow cursor
 * @param {MouseEvent} event - Mouse event with cursor position
 */
function updateHeldCardPosition(event) {
    if (!gameState.heldCardElement) return;
    
    // Use transform for better performance and no lag - separate positioning from visual effects
    const x = event.clientX - 50;
    const y = event.clientY - 70;
    gameState.heldCardElement.style.left = x + 'px';
    gameState.heldCardElement.style.top = y + 'px';
    // Visual effects are handled by CSS .held-card class
    
    // Maintain highlighting during movement
    if (gameState.heldCard && gameState.heldCard.type !== "Incentive") {
        // Check if highlighting is missing and restore it
        const hasHighlighting = document.querySelector('.slot--generator.slot--valid-target, .slot--generator.slot--invalid-target');
        if (!hasHighlighting) {
            showGeneratorHover(gameState.heldCard);
        }
    }
}

/**
 * Handle clicks when holding a card
 * @param {Event} event - Click event
 */
function handleHeldCardClick(event) {
    if (!gameState.heldCard) return;
    
    // Don't put down if clicking on the held card itself
    if (event.target.classList.contains('held-card')) {
        event.stopPropagation();
        return;
    }
    
    // Check if clicking in shop area to put card down
    const shopArea = event.target.closest('.shops-row, .shop-section');
    if (shopArea) {
        putDownHeldCard();
        return;
    }
    
    // If not handled by slot click handlers, put down the card
    setTimeout(() => {
        if (gameState.heldCard) {
            putDownHeldCard();
        }
    }, 0);
}

/**
 * Put down the currently held card
 */
function putDownHeldCard() {
    if (!gameState.heldCard) return;
    
    console.log('Putting down card:', gameState.heldCard.name);
    
    // Clear hover effects
    if (gameState.heldCard.type === "Incentive") {
        clearIncentiveHover(gameState.heldCard);
    } else {
        clearGeneratorHover(gameState.heldCard);
    }
    
    // Remove held card element
    if (gameState.heldCardElement) {
        gameState.heldCardElement.remove();
        gameState.heldCardElement = null;
    }
    
    // Clear state and remove dragging class from all cards
    document.querySelectorAll('.card--dragging').forEach(el => {
        el.classList.remove('card--dragging');
    });
    gameState.heldCard = null;
    
    // Remove global listeners
    document.removeEventListener('mousemove', updateHeldCardPosition);
    document.removeEventListener('click', handleHeldCardClick);
}

/**
 * Add interaction handlers to a card element
 * @param {HTMLElement} cardDiv - The card element
 * @param {Object} card - The card data
 */
function addCardInteractionHandlers(cardDiv, card) {
    const isIncentive = card.type === "Incentive";
    const hoverShowFn = isIncentive ? showIncentiveHover : showGeneratorHover;
    const hoverClearFn = isIncentive ? clearIncentiveHover : clearGeneratorHover;
    
    cardDiv.addEventListener('mouseenter', () => {
        if (!gameState.heldCard && canCardBePlacedAnywhere(card)) {
            hoverShowFn(card);
        }
    });
    
    cardDiv.addEventListener('mouseleave', () => {
        if (!gameState.heldCard && canCardBePlacedAnywhere(card)) {
            hoverClearFn(card);
        }
    });
    
    cardDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`${card.type} card clicked:`, card.name);
        if (canCardBePlacedAnywhere(card)) {
            pickUpCard(card, cardDiv, e);
        }
    });
}

/**
 * Create drag event handlers for a slot
 * @param {HTMLElement} slot - The slot element
 * @param {number} index - The slot index
 * @param {string} slotType - 'generator' or 'consumer'
 * @param {Function} validationFn - Function to check if card can be placed
 * @param {Function} placementFn - Function to handle card placement
 */
function addDragHandlers(slot, index, slotType, validationFn, placementFn) {
    slot.addEventListener('dragover', (e) => {
        const cardData = getDraggedCardData(e);
        if (cardData && validationFn(cardData, index)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = canPlaceCard(cardData, slotType, index) ? 'move' : 'none';
        }
    });
    
    slot.addEventListener('dragenter', (e) => {
        const cardData = getDraggedCardData(e);
        if (cardData && validationFn(cardData, index)) {
            e.preventDefault();
            const canPlace = canPlaceCard(cardData, slotType, index);
            if (canPlace) {
                slot.classList.add('slot--drag-over');
            }
            showProjection(cardData, slotType, index, canPlace);
        }
    });
    
    slot.addEventListener('dragleave', (e) => {
        if (!slot.contains(e.relatedTarget)) {
            slot.classList.remove('slot--drag-over');
            clearProjection();
        }
    });
    
    slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('slot--drag-over');
        
        try {
            const cardData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (validationFn(cardData, index)) {
                placementFn(cardData, index);
            }
            clearAllDragHighlights();
            clearProjection();
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    });
}

/**
 * Create held card hover handlers for a slot
 * @param {HTMLElement} slot - The slot element
 * @param {number} index - The slot index
 * @param {Function} validationFn - Function to check if held card matches this slot
 * @param {Function} hoverFn - Function to handle hover effects
 */
function addHeldCardHoverHandlers(slot, index, validationFn, hoverFn) {
    slot.addEventListener('mouseenter', () => {
        if (gameState.heldCard && validationFn(gameState.heldCard, index)) {
            hoverFn(gameState.heldCard, index, true);
        }
    });
    
    slot.addEventListener('mouseleave', () => {
        if (gameState.heldCard && validationFn(gameState.heldCard, index)) {
            hoverFn(gameState.heldCard, index, false);
        }
    });
}

/**
 * Handle card placement after drag/drop
 * @param {Object} cardData - The card data
 * @param {string} slotType - 'generator' or 'consumer'
 * @param {number} index - The slot index
 */
function handleCardPlacement(cardData, slotType, index) {
    if (slotType === 'generator') {
        if (cardData.type === "Big Generator") {
            gameState.generators[index] = { ...cardData, faceDown: true };
        } else {
            gameState.generators[index] = cardData;
        }
    } else if (slotType === 'consumer' && cardData.type === "Incentive") {
        gameState.consumers[index] = cardData;
    }
    
    // Remove card from shop
    gameState.shop = gameState.shop.filter(c => c.id !== cardData.id);
    
    updateShopInventory();
    updateDisplay();
    checkWinCondition();
    
    if (!gameState.gameWon) {
        updateGameStatus("Card placed! Advancing to next turn...");
        setTimeout(nextTurn, 1000);
    }
}

/**
 * Place the currently held card in a slot
 * @param {string} slotType - 'generator' or 'consumer'
 * @param {number} slotIndex - The slot index
 */
function placeHeldCard(slotType, slotIndex) {
    if (!gameState.heldCard) return;
    
    const card = gameState.heldCard;
    console.log('Placing held card:', card.name, 'in', slotType, 'slot', slotIndex);
    
    if (!canPlaceCard(card, slotType, slotIndex)) {
        updateGameStatus("Invalid placement! This would make the grid unstable.");
        return;
    }
    
    if (slotType === 'generator') {
        if (card.type === "Big Generator") {
            gameState.generators[slotIndex] = { ...card, faceDown: true };
        } else {
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
    
    // Clean up held card state
    putDownHeldCard();
    
    updateShopInventory();
    updateDisplay();
    checkWinCondition();
    
    if (!gameState.gameWon) {
        updateGameStatus("Card placed! Advancing to next turn...");
        setTimeout(nextTurn, 1000);
    }
}

/**
 * Update drag following element position
 * @param {DragEvent} event - Drag event with cursor position
 */
function updateDragElementPosition(event) {
    const dragElement = document.querySelector('.card--drag-following');
    if (!dragElement) return;
    
    // Firefox might give 0,0 coordinates sometimes, so be more lenient
    if (event.clientX !== undefined && event.clientY !== undefined) {
        // Only skip if both are exactly 0 (which happens at start of drag in some browsers)
        if (event.clientX === 0 && event.clientY === 0 && 
            dragElement.style.left !== '0px') {
            return; // Skip this update if we already have a position set
        }
        
        const x = event.clientX - 50;
        const y = event.clientY - 70;
        dragElement.style.left = x + 'px';
        dragElement.style.top = y + 'px';
    }
}

/**
 * Clear all drag-over highlights from slots
 */
function clearAllDragHighlights() {
    document.querySelectorAll('.slot--drag-over').forEach(slot => {
        slot.classList.remove('slot--drag-over');
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
    document.querySelectorAll('.slot--generator').forEach((slot, index) => {
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
    document.querySelectorAll('.slot--consumer').forEach((slot, index) => {
        slot.innerHTML = '';
        if (gameState.consumers[index]) {
            const consumer = gameState.consumers[index];
            const cardElement = createCardElement(consumer, false, consumer.faceDown);
            if (consumer.faceDown) {
                cardElement.classList.add('card--unrevealed');
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
    
    // Helper function to create shop slots
    function createShopSlots(container, count = 8) {
        for (let i = 0; i < count; i++) {
            const shopSlot = document.createElement('div');
            shopSlot.className = 'shop__slot';
            container.appendChild(shopSlot);
        }
    }
    
    // Create shop slots for generators and incentives
    createShopSlots(generatorShop);
    createShopSlots(incentiveShop);
    
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
                        cardElement.classList.add('card--unrevealed');
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
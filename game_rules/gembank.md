# Gem Interaction System

## Overview
The gem system allows players to collect gems following Splendor's rules with immediate visual feedback and validation.

## Components
1. **Gem Bank (Top Right)**
   - Shows available gems with counts
   - Interactive gem selection
   - Visual feedback (dimmed when unavailable)

2. **Active Player Area (Bottom)**
   - Shows current player's gems
   - Temporary selections in green
   - Clickable selected gems to undo
   - "Take Gems & End Turn" button when gems are selected

## Gem Selection Rules

### Taking Two of the Same Color
- Must have 4+ gems available in bank
- Must be your first selection
- Cannot select any other gems after taking 2
- Both gems must be from the same color

### Taking Three Different Colors
- Can take 1 gem from up to 3 different colors
- Cannot take 2 of any color once you've selected a different color
- Must have at least 1 gem available in bank for each selection

## Interaction Flow
1. **Selecting Gems**
   - Click a gem in the bank to select it
   - Bank count decreases immediately
   - Selected gems appear in player area in green

2. **Deselecting Gems**
   - Click a selected (green) gem in player area
   - Gem returns to bank
   - Selection is cleared

3. **Confirming Selection**
   - Click "Take Gems & End Turn"
   - Selected gems are added to player's collection
   - Turn ends

## Visual Indicators
- **Disabled Gems (50% opacity)**
  - Gold (always disabled)
  - No gems available
  - Already selected 2 of another color
  - Already selected 3 different colors

- **Selected Gems**
  - Green color in player area
  - Full opacity vs 70% for unselected
  - Clickable to deselect

## Error Prevention
The system prevents invalid moves with:
- Disabled UI elements
- Warning toasts for invalid attempts
- Clear feedback on why an action isn't allowed 
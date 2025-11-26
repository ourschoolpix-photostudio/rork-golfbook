# Wolf Game Payment Settlement Feature

## Overview
Added a payment settlement system for Wolf games that calculates dollar amounts won/owed based on points earned and optimizes transactions to minimize the number of payments needed.

## Features Implemented

### 1. Dollar Amount Configuration
- Added optional dollar amount field when creating Wolf games
- Users can specify dollar amount per point in the "Betting (Optional)" section
- Dollar amount is stored in the database and associated with the game

### 2. Payment Display on Scorecard
When viewing a completed Wolf game scorecard:
- Each player card displays the total dollar amount they won (e.g., "$12.50")
- Dollar amounts are color-coded:
  - Green for positive amounts (money won)
  - Red for negative amounts (money owed)

### 3. Optimized Payment Settlement
A "Payment Settlement" section shows the most efficient way to settle payments:
- Calculates net balances for all players
- Uses a greedy algorithm to minimize the number of transactions
- Shows who owes whom and how much
- Example: Instead of 12 transactions in a 4-player game, optimizes to 2-3 transactions

#### Settlement Algorithm
1. Calculate each player's gross winnings (points × dollar amount)
2. Calculate average payout across all players
3. Determine each player's net balance (winnings - average)
4. Match creditors (positive balance) with debtors (negative balance)
5. Generate minimal set of transactions to balance all accounts

### 4. Database Schema
Added `dollar_amount` column to `personal_games` table:
```sql
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS dollar_amount DECIMAL(10, 2);
```

## Technical Implementation

### Files Modified

1. **types/index.ts**
   - Added `dollarAmount?: number` to `PersonalGame` interface

2. **components/CreateGameModal.tsx**
   - Modified to accept and pass `dollarAmount` parameter
   - Parses betting amount input and passes to save handler

3. **contexts/GamesContext.tsx**
   - Updated `createGame` function to accept `dollarAmount` parameter
   - Passes dollar amount to backend when creating games

4. **app/(game)/[gameId]/scorecard.tsx**
   - Added `calculatePayments()` function with settlement algorithm
   - Displays dollar amounts on player cards
   - Renders optimized payment settlement section
   - Shows transactions in format: "Player A → Player B: $X.XX"

5. **backend/trpc/routes/games/crud/route.ts**
   - Added `dollarAmount` to game schema
   - Handles `dollar_amount` in create and getAll procedures
   - Maps database field to frontend format

6. **backend/migrations/044_add_dollar_amount_to_games.sql**
   - New migration to add `dollar_amount` column

## Usage

### Creating a Wolf Game with Betting
1. Select "Wolf" as game type
2. Configure players and strokes
3. In "Betting (Optional)" section, enter dollar amount per hole
4. Create the game

### Viewing Settlement After Game
1. Complete all 18 holes
2. Navigate to scorecard
3. View dollar amounts on each player card
4. Check "Payment Settlement" section for optimized transactions

## Example

### Game Setup
- 4 players
- $1 per point
- Final points: Player A: 15, Player B: 8, Player C: 12, Player D: 5

### Calculations
- Player A: $15.00
- Player B: $8.00
- Player C: $12.00
- Player D: $5.00
- Average: $10.00

### Net Balances
- Player A: +$5.00 (owes nothing, receives $5)
- Player B: -$2.00 (owes $2)
- Player C: +$2.00 (owes nothing, receives $2)
- Player D: -$5.00 (owes $5)

### Optimized Settlement
1. Player D pays Player A: $5.00
2. Player B pays Player C: $2.00

Total: 2 transactions instead of 6 direct transactions between all players.

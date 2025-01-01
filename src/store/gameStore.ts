import { create } from 'zustand';
import { GameState, GemType, Card, Player, Gems, Noble } from '../types/game';
import { level1Cards, level2Cards, level3Cards, nobles } from '../data/gameData';

// Initial gem counts based on player count
const INITIAL_GEMS_BY_PLAYER_COUNT: Record<number, Gems> = {
  2: {
    diamond: 4,
    sapphire: 4,
    emerald: 4,
    ruby: 4,
    onyx: 4,
    gold: 5,
  },
  3: {
    diamond: 5,
    sapphire: 5,
    emerald: 5,
    ruby: 5,
    onyx: 5,
    gold: 5,
  },
  4: {
    diamond: 7,
    sapphire: 7,
    emerald: 7,
    ruby: 7,
    onyx: 7,
    gold: 5,
  },
};

const MAX_GEMS_PER_PLAYER = 10;
const WINNING_POINTS = 15;

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface GameStore extends GameState {
  initializeGame: (numPlayers: number, playerNames: string[], debugMode?: boolean) => void;
  takeGems: (gems: Partial<Record<GemType, number>>) => boolean;
  purchaseCard: (card: Card, level: 1 | 2 | 3) => boolean;
  purchaseReservedCard: (cardIndex: number) => boolean;
  reserveCard: (card: Card, level: 1 | 2 | 3) => boolean;
  returnGems: (gems: Partial<Record<GemType, number>>) => void;
  checkNobles: () => Noble[];
  selectNoble: (noble: Noble) => void;
  endTurn: () => void;
  isGameOver: boolean;
  winner: number | null;
  debugMode: boolean;
}

export const useGameStore = create<GameStore>((set, get) => {
  const handleCardPurchase = (
    card: Card,
    player: Player,
    updatedGems: Gems,
    debugMode: boolean
  ): { success: boolean; updatedPlayer: Player; updatedGems: Gems } => {
    // In debug mode, skip cost validation
    if (!debugMode) {
      // Calculate total resources (gems + bonuses) for each type
      const totalResources: Record<GemType, number> = {
        diamond: player.gems.diamond,
        sapphire: player.gems.sapphire,
        emerald: player.gems.emerald,
        ruby: player.gems.ruby,
        onyx: player.gems.onyx,
        gold: player.gems.gold
      };

      // Add bonuses from purchased cards
      player.purchasedCards.forEach((purchasedCard) => {
        totalResources[purchasedCard.gem]++;
      });

      // Check if player can afford the card
      let goldNeeded = 0;
      const gemsToSpend: Record<GemType, number> = {
        diamond: 0,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
        gold: 0
      };

      // For each cost, calculate how many gems we need
      for (const [gem, required] of Object.entries(card.cost)) {
        const gemType = gem as GemType;
        const bonuses = player.purchasedCards.filter(c => c.gem === gemType).length;
        const remainingCost = Math.max(0, required - bonuses);
        
        // If we can't cover it with gems + bonuses, we need gold
        if (remainingCost > player.gems[gemType]) {
          goldNeeded += remainingCost - player.gems[gemType];
          gemsToSpend[gemType] = player.gems[gemType]; // Use all available gems
        } else {
          gemsToSpend[gemType] = remainingCost; // Use just what we need
        }
      }

      // If we need gold and don't have enough, return false
      if (goldNeeded > player.gems.gold) {
        return { success: false, updatedPlayer: player, updatedGems };
      }

      // Add gold to gems to spend if needed
      if (goldNeeded > 0) {
        gemsToSpend.gold = goldNeeded;
      }

      // Update player's gems
      const updatedPlayerGems = { ...player.gems };
      Object.entries(gemsToSpend).forEach(([gem, count]) => {
        const gemType = gem as GemType;
        updatedPlayerGems[gemType] -= count;
        updatedGems[gemType] += count;
      });
      player = { ...player, gems: updatedPlayerGems };
    }

    return {
      success: true,
      updatedPlayer: {
        ...player,
        purchasedCards: [...player.purchasedCards, card]
      },
      updatedGems
    };
  };

  return {
    players: [],
    currentPlayer: 0,
    gems: INITIAL_GEMS_BY_PLAYER_COUNT[2],
    nobles: [],
    cards: {
      level1: [],
      level2: [],
      level3: [],
    },
    visibleCards: {
      level1: [],
      level2: [],
      level3: [],
    },
    isGameOver: false,
    winner: null,
    debugMode: false,

    initializeGame: (numPlayers: number, playerNames: string[], debugMode = false) => {
      const shuffledLevel1 = shuffleArray(level1Cards);
      const shuffledLevel2 = shuffleArray(level2Cards);
      const shuffledLevel3 = shuffleArray(level3Cards);
      const shuffledNobles = shuffleArray(nobles).slice(0, numPlayers + 1);

      const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
        id: i,
        name: playerNames[i],
        gems: { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0, gold: 0 },
        reservedCards: [],
        purchasedCards: [],
        nobles: [],
      }));

      set({
        players,
        currentPlayer: 0,
        gems: INITIAL_GEMS_BY_PLAYER_COUNT[numPlayers],
        nobles: shuffledNobles,
        cards: {
          level1: shuffledLevel1.slice(4),
          level2: shuffledLevel2.slice(4),
          level3: shuffledLevel3.slice(4),
        },
        visibleCards: {
          level1: shuffledLevel1.slice(0, 4),
          level2: shuffledLevel2.slice(0, 4),
          level3: shuffledLevel3.slice(0, 4),
        },
        isGameOver: false,
        winner: null,
        debugMode,
      });
    },

    takeGems: (selectedGems) => {
      const { players, currentPlayer, gems } = get();
      const player = players[currentPlayer];

      // Validate gem selection rules
      const selectedGemCount = Object.values(selectedGems).reduce((sum, count) => sum + (count || 0), 0);
      const uniqueGemsSelected = Object.entries(selectedGems).filter(([_, count]) => count && count > 0).length;
      
      // Calculate current total gems
      const totalPlayerGems = Object.values(player.gems).reduce((sum, count) => sum + count, 0);
      const remainingSpace = MAX_GEMS_PER_PLAYER - totalPlayerGems;

      // If player can't take all selected gems, return false
      if (selectedGemCount > remainingSpace) {
        return false;
      }
      
      // Check if taking 2 of the same gem
      if (selectedGemCount === 2 && uniqueGemsSelected === 1) {
        const gemType = Object.entries(selectedGems).find(([_, count]) => count === 2)?.[0] as GemType;
        if (!gemType || gems[gemType] < 4) return false;
      }
      // Check if taking different gems
      else if (selectedGemCount > 3 || uniqueGemsSelected !== selectedGemCount) {
        return false;
      }

      // Update player's gems and available gems
      const updatedPlayerGems = { ...player.gems };
      const updatedGems = { ...gems };
      
      Object.entries(selectedGems).forEach(([gem, count]) => {
        const gemType = gem as GemType;
        if (count && updatedGems[gemType] >= count) {
          updatedPlayerGems[gemType] += count;
          updatedGems[gemType] -= count;
        }
      });

      const updatedPlayers = [...players];
      updatedPlayers[currentPlayer] = {
        ...player,
        gems: updatedPlayerGems,
      };

      set({
        players: updatedPlayers,
        gems: updatedGems,
      });

      return true;
    },

    returnGems: (gemsToReturn) => {
      const { players, currentPlayer, gems } = get();
      const player = players[currentPlayer];

      const updatedPlayerGems = { ...player.gems };
      const updatedGems = { ...gems };

      Object.entries(gemsToReturn).forEach(([gem, count]) => {
        const gemType = gem as GemType;
        if (count && updatedPlayerGems[gemType] >= count) {
          updatedPlayerGems[gemType] -= count;
          updatedGems[gemType] += count;
        }
      });

      const updatedPlayers = [...players];
      updatedPlayers[currentPlayer] = {
        ...player,
        gems: updatedPlayerGems,
      };

      set({
        players: updatedPlayers,
        gems: updatedGems,
      });
    },

    purchaseCard: (card, level) => {
      const { players, currentPlayer, visibleCards, cards, gems, debugMode } = get();
      const player = players[currentPlayer];
      const updatedGems = { ...gems };
      
      const result = handleCardPurchase(card, player, updatedGems, debugMode);
      if (!result.success) return false;

      const updatedPlayers = [...players];
      const updatedVisibleCards = { ...visibleCards };
      const updatedCards = { ...cards };
      const levelKey = `level${level}` as keyof typeof visibleCards;

      // Update player state
      updatedPlayers[currentPlayer] = result.updatedPlayer;

      // Remove purchased card and draw new one
      updatedVisibleCards[levelKey] = visibleCards[levelKey].filter(c => c !== card);
      if (cards[levelKey].length > 0) {
        updatedVisibleCards[levelKey] = [...updatedVisibleCards[levelKey], cards[levelKey][0]];
        updatedCards[levelKey] = cards[levelKey].slice(1);
      }

      set({
        players: updatedPlayers,
        visibleCards: updatedVisibleCards,
        cards: updatedCards,
        gems: result.updatedGems,
      });

      return true;
    },

    purchaseReservedCard: (cardIndex) => {
      const { players, currentPlayer, gems, debugMode } = get();
      const player = players[currentPlayer];
      const updatedGems = { ...gems };

      if (cardIndex >= player.reservedCards.length) return false;
      const card = player.reservedCards[cardIndex];
      
      const result = handleCardPurchase(card, player, updatedGems, debugMode);
      if (!result.success) return false;

      const updatedPlayers = [...players];
      updatedPlayers[currentPlayer] = {
        ...result.updatedPlayer,
        reservedCards: player.reservedCards.filter((_, i) => i !== cardIndex),
      };

      set({
        players: updatedPlayers,
        gems: result.updatedGems,
      });

      return true;
    },

    reserveCard: (card, level) => {
      const { players, currentPlayer, visibleCards, cards, gems } = get();
      const player = players[currentPlayer];
      
      if (player.reservedCards.length >= 3) return false;

      const updatedPlayers = [...players];
      const updatedVisibleCards = { ...visibleCards };
      const updatedCards = { ...cards };
      const updatedGems = { ...gems };

      // Calculate total gems to check if we can give a gold coin
      const totalPlayerGems = Object.values(player.gems).reduce((sum, count) => sum + count, 0);
      const canTakeGold = totalPlayerGems < MAX_GEMS_PER_PLAYER && gems.gold > 0;

      // Add card to player's reserved cards and give gold if possible
      updatedPlayers[currentPlayer] = {
        ...player,
        reservedCards: [...player.reservedCards, card],
        gems: {
          ...player.gems,
          gold: canTakeGold ? player.gems.gold + 1 : player.gems.gold,
        },
      };

      // Remove card from visible cards
      const levelKey = `level${level}` as keyof typeof visibleCards;
      updatedVisibleCards[levelKey] = visibleCards[levelKey].filter((c) => c !== card);

      // Add new card from deck if available
      if (cards[levelKey].length > 0) {
        updatedVisibleCards[levelKey] = [...updatedVisibleCards[levelKey], cards[levelKey][0]];
        updatedCards[levelKey] = cards[levelKey].slice(1);
      }

      // Update gold gems only if we gave one to the player
      if (canTakeGold) {
        updatedGems.gold--;
      }

      set({
        players: updatedPlayers,
        visibleCards: updatedVisibleCards,
        cards: updatedCards,
        gems: updatedGems,
      });

      return true;
    },

    checkNobles: () => {
      const { players, currentPlayer, nobles } = get();
      const player = players[currentPlayer];
      
      // Find all nobles that the player qualifies for
      const availableNobles = nobles.filter(noble => {
        return Object.entries(noble.requirements).every(([gem, count]) => {
          const playerGemCount = player.purchasedCards.filter(
            card => card.gem === gem
          ).length;
          return playerGemCount >= (count || 0);
        });
      });

      return availableNobles;
    },

    selectNoble: (noble) => {
      const { players, currentPlayer, nobles } = get();
      const player = players[currentPlayer];

      const updatedPlayers = [...players];
      const updatedNobles = nobles.filter(n => n !== noble);
      
      updatedPlayers[currentPlayer] = {
        ...player,
        nobles: [...player.nobles, noble],
      };

      set({
        players: updatedPlayers,
        nobles: updatedNobles,
      });
    },

    endTurn: () => {
      const { players, currentPlayer } = get();
      const nextPlayer = (currentPlayer + 1) % players.length;
      
      // Check for nobles before ending turn
      const availableNobles = get().checkNobles();
      if (availableNobles.length === 1) {
        // If only one noble is available, automatically select it
        get().selectNoble(availableNobles[0]);
      } else if (availableNobles.length > 1) {
        // TODO: Add UI for noble selection when multiple are available
        // For now, select the first available noble
        get().selectNoble(availableNobles[0]);
      }

      // If we're completing a round (going back to player 0)
      if (nextPlayer === 0) {
        // Check if any player has reached 15 points
        const playerPoints = players.map((player, index) => ({
          index,
          points: player.purchasedCards.reduce((sum, c) => sum + c.points, 0) +
            player.nobles.reduce((sum, n) => sum + n.points, 0)
        }));

        const maxPoints = Math.max(...playerPoints.map(p => p.points));
        
        if (maxPoints >= WINNING_POINTS) {
          // Find the winner (player with most points)
          const winner = playerPoints.reduce((maxPlayer, player) => 
            player.points > maxPlayer.points ? player : maxPlayer
          );
          set({ 
            isGameOver: true,
            winner: winner.index,
            currentPlayer: nextPlayer
          });
          return;
        }
      }

      set({ currentPlayer: nextPlayer });
    },
  };
}); 
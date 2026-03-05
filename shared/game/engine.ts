import { level1Cards, level2Cards, level3Cards, nobles } from "../../src/data/gameData";
import { calculatePlayerPoints } from "./selectors";
import type {
  Card,
  GemType,
  Gems,
  Noble,
  OnlineGameAction,
  OnlinePlayer,
  GamePublicState,
} from "../onlineTypes";

interface GameServerState {
  stateVersion: number;
  players: OnlinePlayer[];
  currentPlayer: number;
  gems: Gems;
  nobles: Noble[];
  cards: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  visibleCards: {
    level1: Card[];
    level2: Card[];
    level3: Card[];
  };
  isGameOver: boolean;
  winner: number | null;
  availableNobles: Noble[];
  showNobleSelection: boolean;
  pendingNobleSelectionPlayerId: string | null;
  debugMode: boolean;
}

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
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const cloneState = (state: GameServerState): GameServerState =>
  JSON.parse(JSON.stringify(state)) as GameServerState;

const finalizeActionState = (
  state: GameServerState
): { state: GameServerState } => {
  state.stateVersion += 1;
  return { state };
};

const getLevelKey = (level: 1 | 2 | 3): "level1" | "level2" | "level3" =>
  `level${level}` as "level1" | "level2" | "level3";

const checkNoblesForPlayer = (
  player: OnlinePlayer,
  pool: Noble[]
): Noble[] =>
  pool.filter((noble) =>
    Object.entries(noble.requirements).every(([gem, required]) => {
      const bonusCount = player.purchasedCards.filter((card) => card.gem === gem)
        .length;
      return bonusCount >= (required || 0);
    })
  );

const completeEndTurn = (state: GameServerState): void => {
  const nextPlayer = (state.currentPlayer + 1) % state.players.length;
  state.availableNobles = [];
  state.showNobleSelection = false;
  state.pendingNobleSelectionPlayerId = null;

  if (nextPlayer === 0) {
    const pointTable = state.players.map((player, index) => ({
      index,
      points: calculatePlayerPoints(player),
    }));
    const highest = Math.max(...pointTable.map((entry) => entry.points));

    if (highest >= WINNING_POINTS) {
      const winningEntry = pointTable.reduce((best, candidate) =>
        candidate.points > best.points ? candidate : best
      );
      state.isGameOver = true;
      state.winner = winningEntry.index;
      state.currentPlayer = nextPlayer;
      return;
    }
  }

  state.currentPlayer = nextPlayer;
};

const resolveNoblesAndTurn = (state: GameServerState, playerIndex: number): void => {
  const player = state.players[playerIndex];
  const qualifiedNobles = checkNoblesForPlayer(player, state.nobles);

  if (qualifiedNobles.length === 0) {
    completeEndTurn(state);
    return;
  }

  if (qualifiedNobles.length === 1) {
    const noble = qualifiedNobles[0];
    player.nobles.push(noble);
    state.nobles = state.nobles.filter((poolNoble) => poolNoble !== noble);
    completeEndTurn(state);
    return;
  }

  state.availableNobles = qualifiedNobles;
  state.showNobleSelection = true;
  state.pendingNobleSelectionPlayerId = player.userId;
};

const handleCardPurchase = (
  state: GameServerState,
  player: OnlinePlayer,
  card: Card
): boolean => {
  if (!state.debugMode) {
    const gemsToSpend: Record<GemType, number> = {
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
      gold: 0,
    };

    let goldNeeded = 0;
    for (const [gem, required] of Object.entries(card.cost)) {
      const gemType = gem as GemType;
      const bonusCount = player.purchasedCards.filter((c) => c.gem === gemType).length;
      const remainingCost = Math.max(0, (required || 0) - bonusCount);

      if (remainingCost > player.gems[gemType]) {
        goldNeeded += remainingCost - player.gems[gemType];
        gemsToSpend[gemType] = player.gems[gemType];
      } else {
        gemsToSpend[gemType] = remainingCost;
      }
    }

    if (goldNeeded > player.gems.gold) {
      return false;
    }

    gemsToSpend.gold = goldNeeded;

    for (const [gem, count] of Object.entries(gemsToSpend)) {
      const gemType = gem as GemType;
      if (count > 0) {
        player.gems[gemType] -= count;
        state.gems[gemType] += count;
      }
    }
  }

  player.purchasedCards.push(card);
  return true;
};

export const createInitialGameState = (
  players: Array<{ userId: string; name: string }>,
  debugMode = false
): GameServerState => {
  const shuffledLevel1 = shuffleArray(level1Cards as Card[]);
  const shuffledLevel2 = shuffleArray(level2Cards as Card[]);
  const shuffledLevel3 = shuffleArray(level3Cards as Card[]);
  const shuffledNobles = shuffleArray(nobles as Noble[]).slice(0, players.length + 1);

  const gamePlayers: OnlinePlayer[] = players.map((player, index) => ({
    id: index,
    userId: player.userId,
    name: player.name,
    gems: {
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
      gold: 0,
    },
    reservedCards: [],
    purchasedCards: [],
    nobles: [],
  }));

  return {
    stateVersion: 0,
    players: gamePlayers,
    currentPlayer: 0,
    gems: INITIAL_GEMS_BY_PLAYER_COUNT[players.length],
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
    availableNobles: [],
    showNobleSelection: false,
    pendingNobleSelectionPlayerId: null,
    debugMode,
  };
};

export const applyGameAction = (
  currentState: GameServerState,
  actorUserId: string,
  action: OnlineGameAction
): { state: GameServerState; error?: string } => {
  const state = cloneState(currentState);
  const actorPlayerIndex = state.players.findIndex(
    (player) => player.userId === actorUserId
  );

  if (actorPlayerIndex < 0) {
    return { state: currentState, error: "You are not part of this game." };
  }

  if (state.isGameOver) {
    return { state: currentState, error: "Game is already over." };
  }

  if (state.pendingNobleSelectionPlayerId) {
    if (action.type !== "select_noble") {
      return {
        state: currentState,
        error: "A noble selection is pending before the turn can continue.",
      };
    }

    if (state.pendingNobleSelectionPlayerId !== actorUserId) {
      return {
        state: currentState,
        error: "Only the active player can select a noble right now.",
      };
    }

    if (
      action.nobleIndex < 0 ||
      action.nobleIndex >= state.availableNobles.length
    ) {
      return { state: currentState, error: "Invalid noble selection." };
    }

    const selectedNoble = state.availableNobles[action.nobleIndex];
    const player = state.players[actorPlayerIndex];
    player.nobles.push(selectedNoble);
    state.nobles = state.nobles.filter((noble) => noble !== selectedNoble);
    completeEndTurn(state);

    return finalizeActionState(state);
  }

  if (state.currentPlayer !== actorPlayerIndex) {
    return { state: currentState, error: "It is not your turn." };
  }

  const player = state.players[actorPlayerIndex];

  switch (action.type) {
    case "take_gems": {
      const selectedGemCount = Object.values(action.gems).reduce(
        (sum, count) => sum + (count || 0),
        0
      );
      const uniqueGemsSelected = Object.values(action.gems).filter(
        (count) => (count || 0) > 0
      ).length;
      const totalPlayerGems = Object.values(player.gems).reduce(
        (sum, count) => sum + count,
        0
      );

      if (selectedGemCount <= 0) {
        return { state: currentState, error: "Select at least one gem." };
      }

      if (selectedGemCount > MAX_GEMS_PER_PLAYER - totalPlayerGems) {
        return { state: currentState, error: "You cannot hold more than 10 gems." };
      }

      if (selectedGemCount === 2 && uniqueGemsSelected === 1) {
        const selectedGem = Object.entries(action.gems).find(
          ([, count]) => count === 2
        )?.[0] as GemType | undefined;
        if (!selectedGem || state.gems[selectedGem] < 4) {
          return {
            state: currentState,
            error: "You can only take two of a gem when bank has at least 4.",
          };
        }
      } else if (selectedGemCount > 3 || selectedGemCount !== uniqueGemsSelected) {
        return {
          state: currentState,
          error: "Take up to three different gems or two of the same gem.",
        };
      }

      for (const [gem, count] of Object.entries(action.gems)) {
        const gemType = gem as GemType;
        const amount = count || 0;
        if (amount > 0) {
          if (gemType === "gold") {
            return { state: currentState, error: "Gold cannot be taken this way." };
          }

          if (state.gems[gemType] < amount) {
            return { state: currentState, error: `Not enough ${gemType} gems.` };
          }
        }
      }

      for (const [gem, count] of Object.entries(action.gems)) {
        const amount = count || 0;
        if (amount > 0) {
          const gemType = gem as GemType;
          player.gems[gemType] += amount;
          state.gems[gemType] -= amount;
        }
      }

      resolveNoblesAndTurn(state, actorPlayerIndex);
      return finalizeActionState(state);
    }

    case "purchase_card": {
      const levelKey = getLevelKey(action.level);
      const card = state.visibleCards[levelKey][action.cardIndex];
      if (!card) {
        return { state: currentState, error: "Card does not exist." };
      }

      const didPurchase = handleCardPurchase(state, player, card);
      if (!didPurchase) {
        return { state: currentState, error: "You cannot afford that card." };
      }

      state.visibleCards[levelKey].splice(action.cardIndex, 1);
      const replacementCard = state.cards[levelKey].shift();
      if (replacementCard) {
        state.visibleCards[levelKey].push(replacementCard);
      }

      resolveNoblesAndTurn(state, actorPlayerIndex);
      return finalizeActionState(state);
    }

    case "reserve_card": {
      const levelKey = getLevelKey(action.level);
      const card = state.visibleCards[levelKey][action.cardIndex];
      if (!card) {
        return { state: currentState, error: "Card does not exist." };
      }

      if (player.reservedCards.length >= 3) {
        return {
          state: currentState,
          error: "You cannot reserve more than 3 cards.",
        };
      }

      const playerGemCount = Object.values(player.gems).reduce(
        (sum, count) => sum + count,
        0
      );
      const canTakeGold = playerGemCount < MAX_GEMS_PER_PLAYER && state.gems.gold > 0;
      if (canTakeGold) {
        player.gems.gold += 1;
        state.gems.gold -= 1;
      }

      player.reservedCards.push(card);
      state.visibleCards[levelKey].splice(action.cardIndex, 1);
      const replacementCard = state.cards[levelKey].shift();
      if (replacementCard) {
        state.visibleCards[levelKey].push(replacementCard);
      }

      resolveNoblesAndTurn(state, actorPlayerIndex);
      return finalizeActionState(state);
    }

    case "purchase_reserved_card": {
      const card = player.reservedCards[action.cardIndex];
      if (!card) {
        return { state: currentState, error: "Reserved card does not exist." };
      }

      const didPurchase = handleCardPurchase(state, player, card);
      if (!didPurchase) {
        return {
          state: currentState,
          error: "You cannot afford that reserved card.",
        };
      }

      player.reservedCards.splice(action.cardIndex, 1);
      resolveNoblesAndTurn(state, actorPlayerIndex);
      return finalizeActionState(state);
    }

    case "end_turn": {
      resolveNoblesAndTurn(state, actorPlayerIndex);
      return finalizeActionState(state);
    }

    case "select_noble":
      return {
        state: currentState,
        error: "Noble selection is not active right now.",
      };

    default:
      return { state: currentState, error: "Unsupported action." };
  }
};

export const toPublicGameState = (state: GameServerState): GamePublicState => ({
  stateVersion: state.stateVersion,
  players: state.players,
  currentPlayer: state.currentPlayer,
  gems: state.gems,
  nobles: state.nobles,
  visibleCards: state.visibleCards,
  deckCounts: {
    level1: state.cards.level1.length,
    level2: state.cards.level2.length,
    level3: state.cards.level3.length,
  },
  isGameOver: state.isGameOver,
  winner: state.winner,
  availableNobles: state.availableNobles,
  showNobleSelection: state.showNobleSelection,
  pendingNobleSelectionPlayerId: state.pendingNobleSelectionPlayerId,
});

export type { GameServerState };

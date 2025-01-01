import { Card, Noble, GemType } from '../types/game';

const GEMS: Exclude<GemType, 'gold'>[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'];

function generateCards(level: 1 | 2 | 3, count: number): Card[] {
  const cards: Card[] = [];
  
  // Card generation rules per level
  const rules = {
    1: {
      pointRange: [0, 1],
      maxCost: 5,
      minCost: 3,
      maxSingleGemCost: 3,
    },
    2: {
      pointRange: [1, 3],
      maxCost: 7,
      minCost: 5,
      maxSingleGemCost: 5,
    },
    3: {
      pointRange: [3, 5],
      maxCost: 10,
      minCost: 7,
      maxSingleGemCost: 7,
    },
  };

  for (let i = 0; i < count; i++) {
    const rule = rules[level];
    const points = Math.floor(Math.random() * (rule.pointRange[1] - rule.pointRange[0] + 1)) + rule.pointRange[0];
    const gem = GEMS[Math.floor(Math.random() * GEMS.length)];
    
    // Generate cost
    const cost: Partial<Record<Exclude<GemType, 'gold'>, number>> = {};
    const totalCost = Math.floor(Math.random() * (rule.maxCost - rule.minCost + 1)) + rule.minCost;
    let remainingCost = totalCost;
    
    // Randomly distribute cost among gems
    const availableGems = [...GEMS].filter(g => g !== gem); // Can't cost its own gem type
    while (remainingCost > 0 && availableGems.length > 0) {
      const gemIndex = Math.floor(Math.random() * availableGems.length);
      const selectedGem = availableGems[gemIndex];
      const maxCost = Math.min(remainingCost, rule.maxSingleGemCost);
      const gemCost = Math.floor(Math.random() * maxCost) + 1;
      
      cost[selectedGem] = gemCost;
      remainingCost -= gemCost;
      availableGems.splice(gemIndex, 1);
    }

    // If there's remaining cost, distribute it randomly among existing costs
    while (remainingCost > 0) {
      const existingGems = Object.keys(cost) as Exclude<GemType, 'gold'>[];
      const selectedGem = existingGems[Math.floor(Math.random() * existingGems.length)];
      const currentCost = cost[selectedGem] || 0;
      if (currentCost < rule.maxSingleGemCost) {
        cost[selectedGem] = currentCost + 1;
        remainingCost--;
      }
    }

    cards.push({
      level,
      points,
      gem,
      cost,
    });
  }

  return cards;
}

function generateNobles(count: number): Noble[] {
  const nobles: Noble[] = [];
  const usedCombinations = new Set<string>();
  
  while (nobles.length < count) {
    const requirements: Partial<Record<Exclude<GemType, 'gold'>, number>> = {};
    const requiredGemCount = Math.random() < 0.5 ? 3 : 2; // Either 2 or 3 different gems
    const requiredAmount = requiredGemCount === 2 ? 4 : 3; // 4 each for 2 gems, 3 each for 3 gems
    
    // Randomly select gems
    const selectedGems = [...GEMS]
      .sort(() => Math.random() - 0.5)
      .slice(0, requiredGemCount);
    
    selectedGems.forEach(gem => {
      requirements[gem] = requiredAmount;
    });

    // Create a string key to check for uniqueness
    const combinationKey = Object.entries(requirements)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([gem, count]) => `${gem}:${count}`)
      .join(',');

    if (!usedCombinations.has(combinationKey)) {
      usedCombinations.add(combinationKey);
      nobles.push({
        points: 3,
        requirements,
      });
    }
  }

  return nobles;
}

// Generate initial game data
export const level1Cards = generateCards(1, 40); // More cards for level 1
export const level2Cards = generateCards(2, 30);
export const level3Cards = generateCards(3, 20);
export const nobles = generateNobles(10); // Generate 10 nobles, game will select based on player count 
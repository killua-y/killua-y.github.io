(function (global) {
  // Share of hands drawn from the chart's boundary cells. The remainder comes
  // from the whole range, so the mix still feels like real deals while the
  // close decisions that are actually worth drilling show up far more often.
  // Raising this past ~0.65 buys little: the folding region has such a long
  // border that even sampling boundaries alone leaves Fold near half the
  // answers in 3-bet spots.
  const BOUNDARY_SHARE = 0.65;

  const COMBOS = { pair: 6, suited: 4, offsuit: 12 };

  function comboWeight(hand) {
    if (hand.length === 2) return COMBOS.pair;
    if (hand.endsWith("s")) return COMBOS.suited;
    return COMBOS.offsuit;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickWeighted(items, weightFn) {
    let sum = 0;
    const weights = items.map((item) => {
      const w = weightFn(item);
      sum += w;
      return w;
    });
    let r = Math.random() * sum;
    for (let i = 0; i < items.length; i += 1) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  // You can only face a 3-bet with a hand you opened, so vs-3bet charts deal
  // from the prior opening range instead of the whole grid.
  function poolFor(chart, excluded) {
    let pool;
    if (
      chart.family === "RFI vs 3bet" &&
      chart.prior_range_hands &&
      chart.prior_range_hands.length
    ) {
      pool = chart.prior_range_hands.filter((hand) => chart.hands[hand]);
    } else {
      pool = Object.keys(chart.hands);
    }

    if (!excluded || !excluded.size) return pool;
    const kept = pool.filter((hand) => !excluded.has(hand));
    return kept.length ? kept : pool;
  }

  // boundary_hands is grouped by action pair; the union is every hand sitting
  // next to a different action. Note the source also ships
  // prior_range_boundary_hands, but that traces the edge of the opening range
  // itself and includes hands outside it, so it is deliberately not used here.
  function boundaryFor(chart, pool) {
    if (!chart.boundary_hands) return [];
    const inPool = new Set(pool);
    const seen = new Set();
    for (const hands of Object.values(chart.boundary_hands)) {
      for (const hand of hands) {
        if (inPool.has(hand)) seen.add(hand);
      }
    }
    return [...seen];
  }

  // Spots are indexed mode -> hero position -> concrete (chart, villain) pairs
  // so each level can be sampled uniformly. That keeps the three spot types
  // evenly mixed, stops positions with many charts from dominating, and gives
  // every villain equal weight even when the source bundles several of them
  // into one chart.
  function buildIndex(charts, excludedHands) {
    const excluded = new Set(excludedHands || []);
    const pools = new Map();
    const modes = {};

    for (const chart of charts) {
      const pool = poolFor(chart, excluded);
      pools.set(chart, { all: pool, boundary: boundaryFor(chart, pool) });

      const villains = chart.opponent_positions.length
        ? chart.opponent_positions
        : [null];

      if (!modes[chart.mode]) modes[chart.mode] = {};
      const byPosition = modes[chart.mode];

      for (const villain of villains) {
        if (!byPosition[chart.hero_position]) {
          byPosition[chart.hero_position] = [];
        }
        byPosition[chart.hero_position].push({ chart, opponent: villain });
      }
    }

    return { modes, pools, excluded };
  }

  function dealableHands(index, chart) {
    const pools = index.pools.get(chart);
    return new Set(pools ? pools.all : []);
  }

  function pickSpot(index) {
    const byPosition = index.modes[pick(Object.keys(index.modes))];
    const spots = byPosition[pick(Object.keys(byPosition))];
    return pick(spots);
  }

  function pickHand(index, chart) {
    const pools = index.pools.get(chart);
    const useBoundary =
      pools.boundary.length > 0 && Math.random() < BOUNDARY_SHARE;
    return pickWeighted(useBoundary ? pools.boundary : pools.all, comboWeight);
  }

  global.PreflopSelector = {
    BOUNDARY_SHARE,
    buildIndex,
    pickSpot,
    pickHand,
    dealableHands,
    comboWeight,
    poolFor,
    boundaryFor,
  };
})(window);

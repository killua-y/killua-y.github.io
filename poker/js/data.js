(function (global) {
  const FAMILIES = ["RFI", "Facing RFI", "RFI vs 3bet"];
  const MODES = ["open", "3b", "4b"];

  // Derived from the raise hero is offered rather than the chart family, so
  // "SB Limp vs BB Raise" lands in 3b where it belongs even though the source
  // files it under RFI vs 3bet.
  function modeOf(actions) {
    if (actions.some((action) => /4-bet/i.test(action))) return "4b";
    if (actions.some((action) => /3-bet/i.test(action))) return "3b";
    return "open";
  }

  function flattenCharts(raw) {
    const charts = [];
    for (const family of FAMILIES) {
      const group = raw[family];
      if (!group) continue;
      for (const [key, chart] of Object.entries(group)) {
        charts.push({
          family,
          key,
          mode: modeOf(chart.actions),
          chart_title: chart.chart_title,
          hero_position: chart.hero_position,
          actions: chart.actions.slice(),
          hands: chart.hands,
          opponent_positions: chart.opponent_positions
            ? chart.opponent_positions.slice()
            : [],
          opponent_action: chart.opponent_action || null,
          prior_action: chart.prior_action || null,
          prior_range_hands: chart.prior_range_hands
            ? chart.prior_range_hands.slice()
            : null,
          boundary_hands: chart.boundary_hands || null,
          combo_summary: chart.combo_summary || null,
        });
      }
    }
    return charts;
  }

  async function loadStrategy() {
    const response = await fetch("./preflop_strategy.json");
    if (!response.ok) {
      throw new Error("Could not load preflop_strategy.json");
    }
    const raw = await response.json();
    return {
      raw,
      schema: raw.schema,
      charts: flattenCharts(raw),
    };
  }

  // Hands that fold in every chart of the book, e.g. 72o, which even the
  // small blind's very wide opening range never plays. They carry no decision
  // to practise, so the trainer never deals them.
  function alwaysFoldHands(charts) {
    if (!charts.length) return [];
    const live = new Set();
    for (const chart of charts) {
      for (const [hand, action] of Object.entries(chart.hands)) {
        if (action !== "Fold") live.add(hand);
      }
    }
    return Object.keys(charts[0].hands).filter((hand) => !live.has(hand));
  }

  function chartsForMode(charts, mode) {
    if (mode === "any") return charts;
    return charts.filter((chart) => chart.mode === mode);
  }

  global.PreflopData = {
    loadStrategy,
    flattenCharts,
    chartsForMode,
    alwaysFoldHands,
    modeOf,
    FAMILIES,
    MODES,
  };
})(window);

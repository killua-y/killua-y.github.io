(function (global) {
  const SB_BB = 0.5;
  const BB_BB = 1;
  const START_STACK_BB = 100;

  // The charts are quoted with an ante in play, but the source's sizing and pot
  // figures are all blinds-only, so the felt models blinds only too.
  const ANTE_BB = 0;

  // source.assumptions in preflop_strategy.json
  const SIZING = {
    ip: { open: 2.5, threeBet: 3.0, fourBet: 2.5 },
    oop: { open: 3.5, threeBet: 3.5, fourBet: 2.75 },
  };

  // Raising over a limp is not covered by the source assumptions; use the
  // larger of its two open sizes, which matches the usual isolation size.
  const VS_LIMP_RAISE_BB = SIZING.oop.open;

  const POSTFLOP_ORDER = [
    "SB",
    "BB",
    "UTG",
    "UTG+1",
    "UTG+2",
    "LJ",
    "HJ",
    "CO",
    "BTN",
  ];

  function isInPosition(pos, versus) {
    return POSTFLOP_ORDER.indexOf(pos) > POSTFLOP_ORDER.indexOf(versus);
  }

  function table(pos, versus) {
    return isInPosition(pos, versus) ? SIZING.ip : SIZING.oop;
  }

  // Sizes land on whole big blinds once they get large enough that half-blind
  // precision stops being meaningful at the table.
  function roundBet(bb) {
    const capped = Math.min(bb, START_STACK_BB);
    return capped >= 5 ? Math.round(capped) : Math.round(capped * 2) / 2;
  }

  // The small blind is the only open that plays out of position against the
  // whole field, so it is the only one that uses the larger open size.
  function openTo(pos) {
    return pos === "SB" ? SIZING.oop.open : SIZING.ip.open;
  }

  function threeBetTo(pos, versus, facing) {
    return roundBet(table(pos, versus).threeBet * facing);
  }

  function fourBetTo(pos, versus, facing) {
    return roundBet(table(pos, versus).fourBet * facing);
  }

  function formatBB(bb) {
    if (bb === null || bb === undefined) return "";
    return Number.isInteger(bb) ? String(bb) : bb.toFixed(1);
  }

  function potOdds(toCall, pot) {
    if (toCall <= 0) return null;
    return toCall / (pot + toCall);
  }

  global.PreflopSizing = {
    SB_BB,
    BB_BB,
    ANTE_BB,
    START_STACK_BB,
    VS_LIMP_RAISE_BB,
    POSTFLOP_ORDER,
    isInPosition,
    roundBet,
    openTo,
    threeBetTo,
    fourBetTo,
    formatBB,
    potOdds,
  };
})(window);

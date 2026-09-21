(function (global) {
  const KIND_ORDER = { fold: 0, limp: 1, call: 2, bluff: 3, value: 4 };

  function kindOf(action) {
    const t = String(action).toLowerCase();
    if (t === "fold") return "fold";
    if (t === "limp") return "limp";
    if (t === "call") return "call";
    if (t.includes("bluff")) return "bluff";
    return "value";
  }

  // "3-bet as a Bluff" -> "3-BET BLUFF", "Raise for Value" -> "RAISE VALUE"
  function shortLabel(action) {
    const raw = String(action);
    const split = raw.split(/\s+(?:as a|for)\s+/i);
    const base = split[0];
    const qualifier = split.length > 1 ? split[1] : "";
    return (base + " " + qualifier).trim().toUpperCase();
  }

  function classify(action) {
    const kind = kindOf(action);
    return {
      action,
      kind,
      order: KIND_ORDER[kind],
      short: shortLabel(action),
      isAggressive: kind === "bluff" || kind === "value",
    };
  }

  // Ascending aggression, so a given action keeps the same slot across hands.
  function sortForDisplay(actions) {
    return actions
      .map(classify)
      .sort((a, b) => a.order - b.order || a.action.localeCompare(b.action));
  }

  global.PreflopActions = { classify, sortForDisplay, shortLabel, kindOf };
})(window);

(function (global) {
  const ALL_COMBOS = 1326;

  function handAt(order, row, col) {
    const a = order[row];
    const b = order[col];
    if (row === col) return a + b;
    if (col > row) return a + b + "s";
    return b + a + "o";
  }

  function buildMatrix(root, order) {
    const header =
      "<tr><th></th>" +
      order.map((rank) => "<th>" + rank + "</th>").join("") +
      "</tr>";

    const body = order
      .map((rowRank, row) => {
        const cells = order
          .map((_, col) => {
            const hand = handAt(order, row, col);
            return (
              '<td data-hand="' + hand + '" class="cell">' + hand + "</td>"
            );
          })
          .join("");
        return "<tr><th>" + rowRank + "</th>" + cells + "</tr>";
      })
      .join("");

    root.innerHTML =
      '<table class="hand-matrix"><thead>' +
      header +
      "</thead><tbody>" +
      body +
      "</tbody></table>";
  }

  function clearPaint(root) {
    if (!root) return;
    root.querySelectorAll("td[data-hand]").forEach((cell) => {
      cell.className = "cell";
    });
  }

  // dealable is the set of hands this chart can actually deal, so anything
  // outside it is dimmed: hands the hero never opened, and hands that fold in
  // every chart and are therefore excluded from practice entirely.
  function paintChart(root, chart, currentHand, dealable) {
    clearPaint(root);
    if (!root || !chart) return;

    root.querySelectorAll("td[data-hand]").forEach((cell) => {
      const hand = cell.dataset.hand;
      const action = chart.hands[hand];
      if (!action) return;
      cell.classList.add("act-" + PreflopActions.kindOf(action));
      if (dealable && !dealable.has(hand)) cell.classList.add("not-dealt");
      if (hand === currentHand) cell.classList.add("current");
    });
  }

  function comboCounts(chart) {
    const summary = chart.combo_summary || {};
    if (summary.prior_range_combo_counts) {
      return {
        counts: summary.prior_range_combo_counts,
        total: summary.prior_range_combo_count || ALL_COMBOS,
      };
    }
    return { counts: summary.all_1326_combo_counts || {}, total: ALL_COMBOS };
  }

  function renderLegend(root, chart) {
    if (!root) return;
    const { counts, total } = comboCounts(chart);
    root.innerHTML = PreflopActions.sortForDisplay(chart.actions)
      .map((info) => {
        const combos = counts[info.action];
        const share =
          combos === undefined
            ? ""
            : '<span class="legend-share">' +
              ((combos / total) * 100).toFixed(1) +
              "%</span>";
        return (
          '<span class="legend-item act-' +
          info.kind +
          '"><i class="legend-swatch"></i>' +
          info.action +
          share +
          "</span>"
        );
      })
      .join("");
  }

  global.PreflopMatrix = {
    buildMatrix,
    paintChart,
    clearPaint,
    renderLegend,
    handAt,
  };
})(window);

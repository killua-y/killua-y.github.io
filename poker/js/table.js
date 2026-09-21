(function (global) {
  const S = global.PreflopSizing;

  // Hero sits at the bottom of the felt so the cards read directly above the
  // action bar; everyone else fans out clockwise in order of action.
  const HERO_ANGLE = 90;
  const SEAT_STEP = 40;
  const SEAT_RX = 45;
  const SEAT_RY = 37;
  const CHIP_RX = 32;
  const CHIP_RY = 26;

  const ASSUMPTIONS =
    "9-max, ~100bb effective, ante in play. Opens 2.5bb (3.5bb from the SB), " +
    "3-bets 3x in position and 3.5x out of position, 4-bets 2.5x / 2.75x.";

  function point(angle, rx, ry) {
    const rad = (angle * Math.PI) / 180;
    return {
      left: 50 + rx * Math.cos(rad),
      top: 50 + ry * Math.sin(rad),
      cos: Math.cos(rad),
      sin: Math.sin(rad),
    };
  }

  function cardHtml(card, extraClass) {
    return (
      '<div class="card suit-' +
      card.suit.name +
      (extraClass ? " " + extraClass : "") +
      '"><span class="card-rank">' +
      card.rank +
      '</span><span class="card-suit">' +
      card.suit.symbol +
      "</span></div>"
    );
  }

  function chipClass(amount) {
    if (amount < 1) return "chip-white";
    if (amount < 5) return "chip-blue";
    if (amount < 20) return "chip-green";
    return "chip-red";
  }

  // The dealer button tucks against whichever edge of the pod faces the middle
  // of the felt, so it never lands on top of the cards.
  function dealerSide(spot) {
    if (spot.cos < -0.7) return "right";
    if (spot.cos > 0.7) return "left";
    return spot.sin > 0 ? "top" : "bottom";
  }

  function seatHtml(round, pos, angle) {
    const seat = round.seats[pos];
    const spot = point(angle, SEAT_RX, SEAT_RY);
    const isHero = seat.status === "hero";
    const side = spot.cos >= 0 ? "side-right" : "side-left";
    const classes = ["seat", "is-" + seat.status, side];
    if (round.opponent === pos) classes.push("is-villain");

    let handHtml = "";
    if (isHero) {
      handHtml =
        '<div class="seat-hand hero-hand">' +
        round.cards.map((card) => cardHtml(card)).join("") +
        "</div>";
    } else if (seat.status !== "folded") {
      handHtml = '<div class="seat-hand"><i class="muck"></i><i class="muck"></i></div>';
    }

    const dealer =
      pos === "BTN"
        ? '<span class="dealer-btn at-' + dealerSide(spot) + '">D</span>'
        : "";

    return (
      '<div class="' +
      classes.join(" ") +
      '" style="left:' +
      spot.left.toFixed(2) +
      "%;top:" +
      spot.top.toFixed(2) +
      '%">' +
      handHtml +
      '<div class="pod">' +
      '<span class="pod-pos">' +
      pos +
      "</span>" +
      '<span class="pod-stack">' +
      S.formatBB(seat.stack) +
      "</span>" +
      dealer +
      "</div>" +
      "</div>"
    );
  }

  function chipsHtml(round, pos, angle) {
    const seat = round.seats[pos];
    if (!seat.invested) return "";
    const spot = point(angle, CHIP_RX, CHIP_RY);
    const classes = ["bet"];
    if (seat.status === "folded") classes.push("is-dead");
    const tag = seat.action
      ? '<span class="bet-tag">' + seat.action + "</span>"
      : "";

    return (
      '<div class="' +
      classes.join(" ") +
      '" style="left:' +
      spot.left.toFixed(2) +
      "%;top:" +
      spot.top.toFixed(2) +
      '%">' +
      '<span class="chip-dot ' +
      chipClass(seat.invested) +
      '"></span><span class="chip-amt">' +
      S.formatBB(seat.invested) +
      "</span>" +
      tag +
      "</div>"
    );
  }

  function centerHtml(round) {
    const canContinue = round.chart.actions.some((action) => {
      const kind = PreflopActions.kindOf(action);
      return kind === "call" || kind === "limp";
    });

    const odds =
      canContinue && round.potOdds !== null
        ? '<span class="pot-odds">' +
          (round.potOdds * 100).toFixed(1) +
          "%</span>"
        : "";

    const toCall =
      canContinue && round.toCall > 0
        ? '<div class="pot-sub">to call ' +
          S.formatBB(round.toCall) +
          " bb</div>"
        : "";

    return (
      '<div class="pot-info">' +
      '<div class="pot-stack" title="' +
      ASSUMPTIONS +
      '">' +
      S.formatBB(round.effStack) +
      "bb<span class=\"info-dot\" aria-hidden=\"true\">i</span></div>" +
      '<div class="pot-main"><strong>' +
      S.formatBB(round.pot) +
      " bb</strong>" +
      odds +
      "</div>" +
      toCall +
      "</div>"
    );
  }

  function renderTable(root, round) {
    const order = global.PreflopTrainer.SEAT_ORDER;
    const heroIndex = order.indexOf(round.hero);
    const angles = {};
    for (let i = 0; i < order.length; i += 1) {
      const delta = (i - heroIndex + order.length) % order.length;
      angles[order[i]] = (HERO_ANGLE + delta * SEAT_STEP) % 360;
    }

    const seats = order
      .map((pos) => seatHtml(round, pos, angles[pos]))
      .join("");
    const bets = order
      .map((pos) => chipsHtml(round, pos, angles[pos]))
      .join("");

    root.innerHTML =
      '<div class="felt">' +
      '<div class="felt-rail"></div>' +
      centerHtml(round) +
      bets +
      seats +
      "</div>";
  }

  global.PreflopTable = { renderTable };
})(window);

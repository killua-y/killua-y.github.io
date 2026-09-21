(function (global) {
  const S = global.PreflopSizing;

  const SEAT_ORDER = [
    "UTG",
    "UTG+1",
    "UTG+2",
    "LJ",
    "HJ",
    "CO",
    "BTN",
    "SB",
    "BB",
  ];

  const SUITS = [
    { code: "s", name: "spade", symbol: "♠" },
    { code: "h", name: "heart", symbol: "♥" },
    { code: "d", name: "diamond", symbol: "♦" },
    { code: "c", name: "club", symbol: "♣" },
  ];

  function indexOfSeat(pos) {
    return SEAT_ORDER.indexOf(pos);
  }

  function betweenExclusive(start, end) {
    const s = indexOfSeat(start);
    const e = indexOfSeat(end);
    if (s < 0 || e < 0) return [];
    const seats = [];
    let i = (s + 1) % SEAT_ORDER.length;
    while (i !== e) {
      seats.push(SEAT_ORDER[i]);
      i = (i + 1) % SEAT_ORDER.length;
    }
    return seats;
  }

  function seatsBefore(pos) {
    return SEAT_ORDER.slice(0, indexOfSeat(pos));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function dealCards(hand) {
    const ranks = [hand[0], hand[1]];
    if (hand.length === 2) {
      const a = pick(SUITS);
      const b = pick(SUITS.filter((s) => s.code !== a.code));
      return [
        { rank: ranks[0], suit: a },
        { rank: ranks[1], suit: b },
      ];
    }
    if (hand.endsWith("s")) {
      const suit = pick(SUITS);
      return [
        { rank: ranks[0], suit },
        { rank: ranks[1], suit },
      ];
    }
    const a = pick(SUITS);
    const b = pick(SUITS.filter((s) => s.code !== a.code));
    return [
      { rank: ranks[0], suit: a },
      { rank: ranks[1], suit: b },
    ];
  }

  function emptySeats() {
    const map = {};
    for (const pos of SEAT_ORDER) {
      map[pos] = {
        pos,
        status: "waiting",
        action: null,
        invested: 0,
        stack: S.START_STACK_BB,
        blind: null,
      };
    }
    map.SB.invested = S.SB_BB;
    map.SB.blind = "SB";
    map.BB.invested = S.BB_BB;
    map.BB.blind = "BB";
    return map;
  }

  function fold(seats, positions) {
    for (const pos of positions) {
      seats[pos].status = "folded";
    }
  }

  function commit(seat, amount, action, status) {
    seat.invested = amount;
    seat.action = action;
    seat.status = status;
  }

  function describe(chart, hero, opponent, heroTo, oppTo, limped) {
    if (chart.family === "RFI") {
      return {
        title: hero + " · raise first in",
        history:
          hero === "UTG"
            ? "You are first to act."
            : "Everyone folds to you.",
      };
    }
    if (chart.family === "Facing RFI") {
      const rest = betweenExclusive(opponent, hero).length
        ? ", folds to you"
        : ", you are next to act";
      return {
        title: hero + " vs " + opponent + " open",
        history:
          opponent + " opens to " + S.formatBB(oppTo) + "bb" + rest + ".",
      };
    }
    if (limped) {
      return {
        title: hero + " limp vs " + opponent + " raise",
        history:
          "You limp, " +
          opponent +
          " raises to " +
          S.formatBB(oppTo) +
          "bb.",
      };
    }
    const rest = betweenExclusive(opponent, hero).length
      ? ", folds back to you"
      : ", back to you";
    return {
      title: hero + " open vs " + opponent + " 3-bet",
      history:
        "You open to " +
        S.formatBB(heroTo) +
        "bb, " +
        opponent +
        " 3-bets to " +
        S.formatBB(oppTo) +
        "bb" +
        rest +
        ".",
    };
  }

  function reconstructSpot(chart, opponent) {
    const hero = chart.hero_position;
    const seats = emptySeats();
    let facing = S.BB_BB;
    let raiseTo = null;
    let heroTo = 0;
    let oppTo = 0;
    let limped = false;

    if (chart.family === "RFI") {
      fold(seats, seatsBefore(hero));
      seats[hero].status = "hero";
      raiseTo = S.openTo(hero);
    } else if (chart.family === "Facing RFI") {
      oppTo = S.openTo(opponent);
      fold(seats, seatsBefore(opponent));
      commit(seats[opponent], oppTo, "Raise", "acted");
      fold(seats, betweenExclusive(opponent, hero));
      seats[hero].status = "hero";
      facing = oppTo;
      raiseTo = S.threeBetTo(hero, opponent, oppTo);
    } else {
      limped = String(chart.prior_action).toLowerCase() === "limp";
      heroTo = limped ? S.BB_BB : S.openTo(hero);
      fold(seats, seatsBefore(hero));
      commit(seats[hero], heroTo, limped ? "Limp" : "Raise", "hero");
      fold(seats, betweenExclusive(hero, opponent));
      oppTo = limped
        ? S.VS_LIMP_RAISE_BB
        : S.threeBetTo(opponent, hero, heroTo);
      commit(seats[opponent], oppTo, limped ? "Raise" : "3-bet", "acted");
      fold(seats, betweenExclusive(opponent, hero));
      facing = oppTo;
      raiseTo = limped
        ? S.threeBetTo(hero, opponent, oppTo)
        : S.fourBetTo(hero, opponent, oppTo);
    }

    let pot = 0;
    for (const pos of SEAT_ORDER) {
      seats[pos].stack = S.START_STACK_BB - seats[pos].invested;
      pot += seats[pos].invested;
    }

    const toCall = facing - seats[hero].invested;
    // Effective stack is the depth the spot is played at, so it counts chips
    // already pushed forward rather than only what is still behind.
    const started = (pos) => seats[pos].stack + seats[pos].invested;
    const effStack = opponent
      ? Math.min(started(hero), started(opponent))
      : started(hero);
    const text = describe(chart, hero, opponent, heroTo, oppTo, limped);

    return {
      seats,
      hero,
      opponent,
      pot,
      toCall,
      facing,
      raiseTo,
      effStack,
      potOdds: S.potOdds(toCall, pot),
      title: text.title,
      history: text.history,
    };
  }

  function sizeFor(action, spot) {
    const info = PreflopActions.classify(action);
    if (info.kind === "fold") return null;
    if (info.isAggressive) return spot.raiseTo;
    return spot.toCall;
  }

  function nextRound(index) {
    const choice = PreflopSelector.pickSpot(index);
    const chart = choice.chart;
    const spot = reconstructSpot(chart, choice.opponent);
    const hand = PreflopSelector.pickHand(index, chart);
    const sizes = {};
    for (const action of chart.actions) {
      sizes[action] = sizeFor(action, spot);
    }
    return Object.assign({}, spot, {
      chart,
      hand,
      cards: dealCards(hand),
      correctAction: chart.hands[hand],
      sizes,
    });
  }

  function grade(round, chosen) {
    return chosen === round.correctAction;
  }

  global.PreflopTrainer = {
    SEAT_ORDER,
    nextRound,
    grade,
  };
})(window);

(function () {
  const S = window.PreflopSizing;

  const screens = {
    welcome: document.getElementById("screen-welcome"),
    trainer: document.getElementById("screen-trainer"),
    results: document.getElementById("screen-results"),
  };

  const startBtn = document.getElementById("start-btn");
  const againBtn = document.getElementById("again-btn");
  const nextBtn = document.getElementById("next-btn");
  const loadError = document.getElementById("load-error");
  const progressEl = document.getElementById("progress");
  const scoreEl = document.getElementById("score");
  const spotTitle = document.getElementById("spot-title");
  const historyLine = document.getElementById("history-line");
  const actionButtons = document.getElementById("action-buttons");
  const feedbackEl = document.getElementById("feedback");
  const tableRoot = document.getElementById("table-root");
  const review = document.getElementById("review");
  const reviewTitle = document.getElementById("review-title");
  const reviewLegend = document.getElementById("review-legend");
  const matrixRoot = document.getElementById("matrix-root");
  const resultsScore = document.getElementById("results-score");
  const resultsPct = document.getElementById("results-pct");

  const MODE_LABELS = {
    open: "Open",
    "3b": "3-bet",
    "4b": "4-bet",
    any: "Mixed spots",
  };

  const state = {
    charts: [],
    index: null,
    deadHands: [],
    schema: null,
    mode: "any",
    total: 10,
    correct: 0,
    answered: 0,
    round: null,
    graded: false,
  };

  function showScreen(name) {
    for (const [key, el] of Object.entries(screens)) {
      el.hidden = key !== name;
    }
  }

  function selectedLength() {
    const chosen = document.querySelector(
      'input[name="session-length"]:checked'
    );
    return Number(chosen && chosen.value ? chosen.value : 10);
  }

  function selectedMode() {
    const chosen = document.querySelector('input[name="session-mode"]:checked');
    return chosen && chosen.value ? chosen.value : "any";
  }

  function check(name, value) {
    const input = document.querySelector(
      'input[name="' + name + '"][value="' + value + '"]'
    );
    if (input) input.checked = true;
  }

  function startSession() {
    state.total = selectedLength();
    state.mode = selectedMode();
    const pool = PreflopData.chartsForMode(state.charts, state.mode);
    state.index = PreflopSelector.buildIndex(
      pool.length ? pool : state.charts,
      state.deadHands
    );
    state.correct = 0;
    state.answered = 0;
    state.round = null;
    state.graded = false;
    showScreen("trainer");
    dealNext();
  }

  function hideFeedback() {
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("good", "bad");
  }

  function showFeedback(kind, message) {
    feedbackEl.textContent = message;
    feedbackEl.classList.remove("good", "bad");
    feedbackEl.classList.add(kind);
    feedbackEl.hidden = false;
  }

  function dealNext() {
    hideFeedback();
    nextBtn.hidden = true;
    nextBtn.blur();
    review.hidden = true;
    PreflopMatrix.clearPaint(matrixRoot);

    const round = PreflopTrainer.nextRound(state.index);
    state.round = round;
    state.graded = false;

    progressEl.textContent =
      "Hand " +
      (state.answered + 1) +
      " of " +
      state.total +
      "  ·  " +
      MODE_LABELS[state.mode];
    scoreEl.textContent = state.correct + " correct";
    spotTitle.textContent = round.title + "  ·  " + round.hand;
    historyLine.textContent = round.history;

    renderActions(round);
    PreflopTable.renderTable(tableRoot, round);

    nextBtn.textContent =
      state.answered + 1 === state.total ? "See results" : "Next hand";
    window.scrollTo(0, 0);
  }

  function renderActions(round) {
    actionButtons.innerHTML = "";
    const infos = PreflopActions.sortForDisplay(round.chart.actions);
    actionButtons.dataset.count = String(infos.length);

    infos.forEach((info, index) => {
      const size = round.sizes[info.action];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "act-btn act-" + info.kind;
      btn.dataset.action = info.action;
      btn.innerHTML =
        '<span class="act-key">' +
        (index + 1) +
        '</span><span class="act-label">' +
        info.short +
        "</span>" +
        (size ? '<span class="act-size">' + S.formatBB(size) + "</span>" : "");
      btn.addEventListener("click", () => onChoose(info.action, btn));
      actionButtons.appendChild(btn);
    });
  }

  function revealChart(round) {
    reviewTitle.textContent =
      round.chart.family + " · " + round.chart.chart_title;
    PreflopMatrix.renderLegend(reviewLegend, round.chart);
    PreflopMatrix.paintChart(
      matrixRoot,
      round.chart,
      round.hand,
      PreflopSelector.dealableHands(state.index, round.chart)
    );
    review.hidden = false;
  }

  function onChoose(action, clicked) {
    if (state.graded || !state.round) return;
    const round = state.round;
    state.graded = true;
    const isCorrect = PreflopTrainer.grade(round, action);
    state.answered += 1;
    if (isCorrect) state.correct += 1;

    actionButtons.querySelectorAll("button").forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("is-settled");
      if (btn.dataset.action === round.correctAction) {
        btn.classList.add("is-correct");
      }
      if (btn === clicked) {
        btn.classList.add("is-chosen");
        if (!isCorrect) btn.classList.add("is-wrong");
      }
    });

    scoreEl.textContent = state.correct + " correct";
    if (isCorrect) {
      showFeedback("good", "Correct · " + round.correctAction);
    } else {
      showFeedback("bad", "Wrong · correct is " + round.correctAction);
    }
    revealChart(round);
    nextBtn.hidden = false;
  }

  function onNext() {
    if (!state.graded) return;
    if (state.answered >= state.total) {
      showResults();
    } else {
      dealNext();
    }
  }

  function showResults() {
    const pct = Math.round((state.correct / state.total) * 100);
    resultsScore.textContent =
      "You got " + state.correct + " / " + state.total + " correct";
    resultsPct.textContent = pct + "% · " + MODE_LABELS[state.mode];
    showScreen("results");
  }

  function playAgain() {
    check("session-length", state.total);
    check("session-mode", state.mode);
    showScreen("welcome");
    startBtn.focus();
  }

  startBtn.addEventListener("click", startSession);
  againBtn.addEventListener("click", playAgain);
  nextBtn.addEventListener("click", onNext);

  document.addEventListener("keydown", (event) => {
    if (screens.trainer.hidden) return;

    if (!state.graded) {
      const slot = Number(event.key);
      if (!Number.isNaN(slot) && slot >= 1) {
        const buttons = actionButtons.querySelectorAll("button");
        const btn = buttons[slot - 1];
        if (btn) {
          event.preventDefault();
          btn.click();
        }
      }
      return;
    }

    if (event.target === nextBtn) return;
    if (event.key === "Enter" || event.key === "n" || event.key === "N") {
      event.preventDefault();
      onNext();
    }
  });

  PreflopData.loadStrategy()
    .then((loaded) => {
      state.charts = loaded.charts;
      state.deadHands = PreflopData.alwaysFoldHands(loaded.charts);
      state.schema = loaded.schema;
      PreflopMatrix.buildMatrix(matrixRoot, loaded.schema.hand_matrix_order);
      startBtn.disabled = false;
      startBtn.textContent = "Start training";
    })
    .catch((err) => {
      loadError.hidden = false;
      loadError.textContent =
        err.message +
        ". Serve this folder over HTTP (for example python3 -m http.server).";
      startBtn.textContent = "Charts failed to load";
    });
})();

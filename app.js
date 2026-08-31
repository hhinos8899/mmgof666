const GROUPS = [
  "PBP",
  "BBP",
  "PPB",
  "PBP",
  "BBP",
  "PPB",
  "PBP",
  "PBB"
];

const LOOP_GROUPS =
  GROUPS
    .slice(1)
    .concat(
      GROUPS.slice(0, 1)
    );

let gameHistory = [];
let waiting = false;

/*
  phase:
  0 = 套入
  1 = 门槛
  2 = 正式预测
*/
let phase = 0;

/* phase 0 */
let matchIdx = 0;
let completedAtRealHand = 0;
let phase0Cursor = 0;

/* phase 1 */
let gateStep = 0;
let gateHits = 0;
let lastGateLine = "";

/* phase 2 */
let loopGroupIdx = 0;
let loopPos = 0;
let phase2StartRealHand = 0;


/* =========================
   第91个 B/P 开始统计
   ========================= */

const STATS_START_HAND = 91;

let predictionTotal = 0;
let predictionHits = 0;

let currentWinStreak = 0;
let currentLoseStreak = 0;

let maxWinStreak = 0;
let maxLoseStreak = 0;


/* =====================================================
   DOM
   ===================================================== */

function byId(id) {
  return document.getElementById(id);
}

function $(sel) {
  return document.querySelector(sel);
}


/* =====================================================
   按钮状态
   ===================================================== */

function setButtonsDisabled(disabled) {

  const buttons =
    document.querySelectorAll(
      '.btn'
    );

  buttons.forEach(btn => {
    btn.disabled = disabled;
  });
}


/* =====================================================
   AI 标签
   ===================================================== */

function setLabelAI() {

  const label =
    byId('resultLabel');

  if (!label) return;

  label.textContent = 'AI';

  label.classList.remove(
    'player',
    'banker'
  );
}


function setLabelSide(side) {

  const label =
    byId('resultLabel');

  if (!label) return;

  label.textContent = side;

  label.classList.remove(
    'player',
    'banker'
  );

  label.classList.add(
    side === 'B'
      ? 'banker'
      : 'player'
  );
}


function showTextOnly(msg) {

  setLabelAI();

  const text =
    byId('predictionText');

  if (text) {
    text.textContent = msg;
  }
}


/* =====================================================
   历史显示
   ===================================================== */

function renderHistory() {

  const recordDisplay =
    byId('recordDisplay');

  if (!recordDisplay) {
    return;
  }

  recordDisplay.innerHTML = '';

  gameHistory.forEach(type => {

    const item =
      document.createElement(
        'div'
      );

    item.className =
      `record-item ${type.toLowerCase()}`;

    item.textContent = type;

    recordDisplay.appendChild(
      item
    );
  });


  const count =
    byId('historyCount');

  if (count) {

    count.textContent =
      `${gameHistory.length}手`;
  }


  requestAnimationFrame(() => {

    recordDisplay.scrollTop =
      recordDisplay.scrollHeight;

  });
}


/* =====================================================
   预测统计
   ===================================================== */

function resetPredictionStats() {

  predictionTotal = 0;
  predictionHits = 0;

  currentWinStreak = 0;
  currentLoseStreak = 0;

  maxWinStreak = 0;
  maxLoseStreak = 0;
}


function settlePrediction(
  actual,
  predicted,
  realHand
) {

  if (
    realHand <
    STATS_START_HAND
  ) {
    return;
  }


  if (
    actual !== 'B' &&
    actual !== 'P'
  ) {
    return;
  }


  if (
    predicted !== 'B' &&
    predicted !== 'P'
  ) {
    return;
  }


  predictionTotal++;


  if (
    actual === predicted
  ) {

    predictionHits++;

    currentWinStreak++;

    currentLoseStreak = 0;


    if (
      currentWinStreak >
      maxWinStreak
    ) {

      maxWinStreak =
        currentWinStreak;
    }

  } else {

    currentLoseStreak++;

    currentWinStreak = 0;


    if (
      currentLoseStreak >
      maxLoseStreak
    ) {

      maxLoseStreak =
        currentLoseStreak;
    }
  }
}


function getHitRate() {

  if (!predictionTotal) {
    return '--';
  }

  return (
    (
      predictionHits /
      predictionTotal *
      100
    ).toFixed(1) +
    '%'
  );
}


function renderPredictionStats() {

  const misses =
    predictionTotal -
    predictionHits;


  const totalEl =
    byId('statTotal');

  const hitsEl =
    byId('statHits');

  const missesEl =
    byId('statMisses');

  const winEl =
    byId('statWinStreak');

  const loseEl =
    byId('statLoseStreak');

  const maxWinEl =
    byId('statMaxWin');

  const maxLoseEl =
    byId('statMaxLose');

  const rateEl =
    byId('statRate');


  if (totalEl) {
    totalEl.textContent =
      predictionTotal;
  }

  if (hitsEl) {
    hitsEl.textContent =
      predictionHits;
  }

  if (missesEl) {
    missesEl.textContent =
      misses;
  }

  if (winEl) {
    winEl.textContent =
      currentWinStreak;
  }

  if (loseEl) {
    loseEl.textContent =
      currentLoseStreak;
  }

  if (maxWinEl) {
    maxWinEl.textContent =
      maxWinStreak;
  }

  if (maxLoseEl) {
    maxLoseEl.textContent =
      maxLoseStreak;
  }

  if (rateEl) {
    rateEl.textContent =
      getHitRate();
  }
}


/* =====================================================
   虚拟手数
   ===================================================== */

function virtualHandFor(realHand) {

  if (!completedAtRealHand) {
    return null;
  }


  if (phase === 1) {

    return (
      25 +
      gateStep
    );
  }


  if (phase === 2) {

    if (!phase2StartRealHand) {
      return null;
    }

    return (
      28 +
      (
        realHand -
        phase2StartRealHand
      )
    );
  }


  return null;
}


function fmtHand(realHand) {

  const v =
    virtualHandFor(
      realHand
    );


  if (v === null) {

    return (
      `第${realHand}手`
    );
  }


  return (
    `第${realHand}手(${v}手)`
  );
}


/* =====================================================
   下一手预测
   ===================================================== */

function nextPredLetter() {

  if (phase === 1) {

    return (
      "PBP"[gateStep]
    );
  }


  const g =
    LOOP_GROUPS[
      loopGroupIdx %
      LOOP_GROUPS.length
    ];


  return g[loopPos];
}


/* =====================================================
   核心推进
   ===================================================== */

function advanceAfterInput(actual) {

  if (phase === 0) {

    const need =
      GROUPS[matchIdx];


    if (
      actual ===
      need[phase0Cursor]
    ) {

      phase0Cursor++;


      if (
        phase0Cursor ===
        need.length
      ) {

        matchIdx++;

        phase0Cursor = 0;


        if (
          matchIdx >=
          GROUPS.length
        ) {

          matchIdx = 0;

          completedAtRealHand =
            gameHistory.length;

          phase = 1;

          gateStep = 0;

          gateHits = 0;

          lastGateLine =
            `✅ 已套完24手｜开始门槛PBP`;

          loopGroupIdx = 0;

          loopPos = 0;

          phase2StartRealHand = 0;
        }
      }
    }


    return;
  }


  if (phase === 1) {

    const pred =
      "PBP"[gateStep];

    const hit =
      actual === pred;


    if (hit) {
      gateHits++;
    }


    const realHand =
      gameHistory.length;


    lastGateLine =
      `${fmtHand(realHand)}｜` +
      `实际${actual}｜` +
      `门槛${pred}｜` +
      `${gateStep + 1}/3｜` +
      `命中${gateHits}`;


    gateStep++;


    if (
      gateStep < 3
    ) {
      return;
    }


    if (
      gateHits >= 1
    ) {

      phase = 2;

      phase2StartRealHand =
        gameHistory.length + 1;

      loopGroupIdx = 0;

      loopPos = 0;

    } else {

      gateStep = 0;

      gateHits = 0;
    }


    return;
  }


  if (phase === 2) {

    const realHand =
      gameHistory.length;


    const predicted =
      nextPredLetter();


    settlePrediction(
      actual,
      predicted,
      realHand
    );


    loopPos++;


    if (
      loopPos >= 3
    ) {

      loopPos = 0;

      loopGroupIdx =
        (
          loopGroupIdx + 1
        ) %
        LOOP_GROUPS.length;
    }


    renderPredictionStats();
  }
}


/* =====================================================
   当前显示
   ===================================================== */

function updateView() {

  const upcomingReal =
    gameHistory.length + 1;


  if (phase === 0) {

    const need =
      GROUPS[matchIdx];


    showTextOnly(
      `套入24手中｜当前需要 ${need}｜顺序命中，中间允许插`
    );


    return;
  }


  if (phase === 1) {

    const p =
      nextPredLetter();


    setLabelSide(p);


    const text =
      byId('predictionText');


    if (text) {

      text.textContent =
        lastGateLine ||
        `门槛PBP｜${fmtHand(upcomingReal)}`;
    }


    return;
  }


  const p =
    nextPredLetter();


  setLabelSide(p);


  const g =
    LOOP_GROUPS[
      loopGroupIdx %
      LOOP_GROUPS.length
    ];


  const text =
    byId('predictionText');


  if (text) {

    text.textContent =
      `${fmtHand(upcomingReal)}｜` +
      `当前组 ${g}｜` +
      `第${loopPos + 1}/3｜` +
      `预测 ${p}`;
  }
}


/* =====================================================
   重算
   ===================================================== */

function recomputeFromHistory(arr) {

  phase = 0;

  matchIdx = 0;

  completedAtRealHand = 0;

  phase0Cursor = 0;


  gateStep = 0;

  gateHits = 0;

  lastGateLine = "";


  loopGroupIdx = 0;

  loopPos = 0;

  phase2StartRealHand = 0;


  resetPredictionStats();


  gameHistory = [];


  arr.forEach(x => {

    gameHistory.push(x);

    advanceAfterInput(x);

  });


  renderPredictionStats();
}


/* =====================================================
   手动输入
   ===================================================== */

window.recordResult =
function(type) {

  if (waiting) {
    return;
  }


  if (
    type !== 'B' &&
    type !== 'P'
  ) {
    return;
  }


  waiting = true;

  setButtonsDisabled(true);


  gameHistory.push(type);

  advanceAfterInput(type);


  renderHistory();

  renderPredictionStats();

  updateView();


  waiting = false;

  setButtonsDisabled(false);
};


/* =====================================================
   Back
   ===================================================== */

window.undoLastMove =
function() {

  if (waiting) {
    return;
  }


  if (!gameHistory.length) {
    return;
  }


  const old =
    [...gameHistory];


  old.pop();


  recomputeFromHistory(
    old
  );


  renderHistory();

  renderPredictionStats();

  updateView();
};


/* =====================================================
   Reset
   ===================================================== */

window.resetGame =
function() {

  if (waiting) {
    return;
  }


  recomputeFromHistory([]);


  renderHistory();

  renderPredictionStats();


  showTextOnly(
    '已清零｜重新开始'
  );


  updateView();


  const statusBox =
    byId('scanStatusBox');


  if (statusBox) {

    statusBox
      .classList
      .add(
        'hidden'
      );
  }
};


/* =====================================================
   截图入口
   ===================================================== */

window.openScreenshot =
function() {

  const input =
    byId('imageInput');


  if (!input) {
    return;
  }


  input.value = '';

  input.click();
};


/* =====================================================
   RGB -> HSV
   ===================================================== */

function rgbToHSV(r, g, b) {

  r /= 255;
  g /= 255;
  b /= 255;


  const max =
    Math.max(r, g, b);

  const min =
    Math.min(r, g, b);

  const d =
    max - min;


  let h = 0;


  if (d !== 0) {

    if (max === r) {

      h =
        60 *
        (((g - b) / d) % 6);

    } else if (max === g) {

      h =
        60 *
        ((b - r) / d + 2);

    } else {

      h =
        60 *
        ((r - g) / d + 4);
    }
  }


  if (h < 0) {
    h += 360;
  }


  const s =
    max === 0
      ? 0
      : d / max;


  return {
    h,
    s,
    v:max
  };
}


/* =====================================================
   颜色分类
   ===================================================== */

function classifyColor(
  r,
  g,
  b,
  a = 255
) {

  if (a < 150) {
    return null;
  }


  const hsv =
    rgbToHSV(
      r,
      g,
      b
    );


  if (
    hsv.s < 0.30 ||
    hsv.v < 0.28
  ) {
    return null;
  }


  if (
    hsv.h <= 22 ||
    hsv.h >= 338
  ) {
    return 'B';
  }


  if (
    hsv.h >= 185 &&
    hsv.h <= 250
  ) {
    return 'P';
  }


  if (
    hsv.h >= 70 &&
    hsv.h <= 170
  ) {
    return 'T';
  }


  return null;
}


/* =====================================================
   连通块
   ===================================================== */

function findColorComponents(
  imageData,
  width,
  height
) {

  const data =
    imageData.data;


  const total =
    width * height;


  const mask =
    new Uint8Array(total);


  const visited =
    new Uint8Array(total);


  for (
    let i = 0;
    i < total;
    i++
  ) {

    const p =
      i * 4;


    const type =
      classifyColor(
        data[p],
        data[p + 1],
        data[p + 2],
        data[p + 3]
      );


    if (type) {
      mask[i] = 1;
    }
  }


  const stack = [];

  const result = [];


  const absoluteMinArea =
    Math.max(
      8,
      Math.floor(
        total *
        0.000006
      )
    );


  for (
    let start = 0;
    start < total;
    start++
  ) {

    if (
      !mask[start] ||
      visited[start]
    ) {
      continue;
    }


    visited[start] = 1;


    stack.length = 0;

    stack.push(start);


    let area = 0;

    let sumX = 0;
    let sumY = 0;

    let minX = width;
    let maxX = 0;

    let minY = height;
    let maxY = 0;


    while (stack.length) {

      const cur =
        stack.pop();


      const y =
        Math.floor(
          cur / width
        );


      const x =
        cur -
        y * width;


      area++;

      sumX += x;
      sumY += y;


      if (x < minX) minX = x;

      if (x > maxX) maxX = x;

      if (y < minY) minY = y;

      if (y > maxY) maxY = y;


      let n;


      if (x > 0) {

        n = cur - 1;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;

          stack.push(n);
        }
      }


      if (
        x <
        width - 1
      ) {

        n = cur + 1;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;

          stack.push(n);
        }
      }


      if (y > 0) {

        n =
          cur - width;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;

          stack.push(n);
        }
      }


      if (
        y <
        height - 1
      ) {

        n =
          cur + width;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;

          stack.push(n);
        }
      }
    }


    if (
      area <
      absoluteMinArea
    ) {
      continue;
    }


    const bw =
      maxX -
      minX +
      1;


    const bh =
      maxY -
      minY +
      1;


    if (
      bw < 3 ||
      bh < 3
    ) {
      continue;
    }


    result.push({

      x:
        sumX / area,

      y:
        sumY / area,

      width:bw,

      height:bh,

      area

    });
  }


  return result;
}


/* =====================================================
   中位数
   ===================================================== */

function median(arr) {

  if (!arr.length) {
    return 0;
  }


  const a =
    [...arr].sort(
      (x, y) =>
        x - y
    );


  const m =
    Math.floor(
      a.length / 2
    );


  if (
    a.length % 2
  ) {
    return a[m];
  }


  return (
    a[m - 1] +
    a[m]
  ) / 2;
}


/* =====================================================
   正常圆直径
   ===================================================== */

function estimateNormalDiameter(
  components
) {

  if (!components.length) {
    return 14;
  }


  let sizes =
    components
      .map(
        p =>
          Math.max(
            p.width,
            p.height
          )
      )
      .filter(
        v =>
          v >= 4
      )
      .sort(
        (a, b) =>
          a - b
      );


  if (!sizes.length) {
    return 14;
  }


  const start =
    Math.floor(
      sizes.length *
      0.40
    );


  let upper =
    sizes.slice(start);


  if (!upper.length) {
    upper = sizes;
  }


  return (
    median(upper) ||
    median(sizes) ||
    14
  );
}


/* =====================================================
   网格圆
   ===================================================== */

function getGridAnchors(
  components,
  normalDiameter
) {

  const minSize =
    normalDiameter *
    0.55;


  const maxSize =
    normalDiameter *
    1.85;


  const minArea =
    normalDiameter *
    normalDiameter *
    0.10;


  return components.filter(
    p => {

      const big =
        Math.max(
          p.width,
          p.height
        );


      const small =
        Math.min(
          p.width,
          p.height
        );


      if (
        big < minSize ||
        big > maxSize
      ) {
        return false;
      }


      if (
        small / big <
        0.48
      ) {
        return false;
      }


      if (
        p.area <
        minArea
      ) {
        return false;
      }


      return true;
    }
  );
}


/* =====================================================
   一维聚类
   ===================================================== */

function clusterValues(
  values,
  tolerance
) {

  if (!values.length) {
    return [];
  }


  const sorted =
    [...values].sort(
      (a, b) =>
        a - b
    );


  const groups = [];


  sorted.forEach(value => {

    let best = null;

    let bestDist =
      Infinity;


    groups.forEach(group => {

      const d =
        Math.abs(
          value -
          group.center
        );


      if (
        d <= tolerance &&
        d < bestDist
      ) {

        best = group;

        bestDist = d;
      }
    });


    if (!best) {

      groups.push({

        center:value,

        values:[value]

      });


      return;
    }


    best.values.push(
      value
    );


    best.center =
      best.values.reduce(
        (sum, x) =>
          sum + x,
        0
      ) /
      best.values.length;

  });


  groups.sort(
    (a, b) =>
      a.center -
      b.center
  );


  return groups;
}


/* =====================================================
   网格间距
   ===================================================== */

function estimateGridSpacing(
  centers,
  normalDiameter
) {

  if (
    centers.length < 2
  ) {

    return (
      normalDiameter *
      1.25
    );
  }


  const diffs = [];


  for (
    let i = 1;
    i < centers.length;
    i++
  ) {

    const d =
      centers[i] -
      centers[i - 1];


    if (
      d >
      normalDiameter *
      0.45
    ) {

      diffs.push(d);
    }
  }


  if (!diffs.length) {

    return (
      normalDiameter *
      1.25
    );
  }


  diffs.sort(
    (a, b) =>
      a - b
  );


  const usable =
    diffs.slice(
      0,
      Math.max(
        1,
        Math.ceil(
          diffs.length *
          0.6
        )
      )
    );


  return (
    median(usable) ||
    normalDiameter *
    1.25
  );
}


/* =====================================================
   建网格
   ===================================================== */

function buildGrid(
  anchors,
  normalDiameter
) {

  if (
    anchors.length < 2
  ) {

    throw new Error(
      '识别到的正常路单圆太少'
    );
  }


  const roughTolerance =
    normalDiameter *
    0.55;


  let rowGroups =
    clusterValues(
      anchors.map(
        p => p.y
      ),
      roughTolerance
    );


  let colGroups =
    clusterValues(
      anchors.map(
        p => p.x
      ),
      roughTolerance
    );


  let rowCenters =
    rowGroups.map(
      g => g.center
    );


  let colCenters =
    colGroups.map(
      g => g.center
    );


  if (
    rowGroups.length > 6
  ) {

    rowGroups =
      [...rowGroups]
        .sort(
          (a, b) =>
            b.values.length -
            a.values.length
        )
        .slice(0, 6)
        .sort(
          (a, b) =>
            a.center -
            b.center
        );


    rowCenters =
      rowGroups.map(
        g => g.center
      );
  }


  const rowSpacing =
    estimateGridSpacing(
      rowCenters,
      normalDiameter
    );


  const colSpacing =
    estimateGridSpacing(
      colCenters,
      normalDiameter
    );


  if (
    rowCenters.length >= 2 &&
    rowCenters.length < 6
  ) {

    const base =
      rowCenters[0];


    const generated = [];


    for (
      let i = 0;
      i < 6;
      i++
    ) {

      const expected =
        base +
        i * rowSpacing;


      let nearest = null;

      let nearestDist =
        Infinity;


      rowCenters.forEach(y => {

        const d =
          Math.abs(
            y -
            expected
          );


        if (
          d <
          nearestDist
        ) {

          nearest = y;

          nearestDist = d;
        }
      });


      if (
        nearest !== null &&
        nearestDist <
        rowSpacing *
        0.42
      ) {

        generated.push(
          nearest
        );

      } else {

        generated.push(
          expected
        );
      }
    }


    rowCenters =
      generated;
  }


  rowCenters =
    rowCenters
      .sort(
        (a, b) =>
          a - b
      )
      .slice(0, 6);


  colCenters =
    colCenters.sort(
      (a, b) =>
        a - b
    );


  return {

    rows:
      rowCenters,

    columns:
      colCenters,

    rowSpacing,

    colSpacing

  };
}


/* =====================================================
   单格识别
   ===================================================== */

function classifyGridCell(
  imageData,
  width,
  height,
  cx,
  cy,
  sampleRadius
) {

  const data =
    imageData.data;


  const counts = {

    B:0,

    P:0,

    T:0

  };


  let totalSampled = 0;


  const radius =
    Math.max(
      4,
      Math.floor(
        sampleRadius
      )
    );


  const radiusSq =
    radius *
    radius;


  const minX =
    Math.max(
      0,
      Math.floor(
        cx -
        radius
      )
    );


  const maxX =
    Math.min(
      width - 1,
      Math.ceil(
        cx +
        radius
      )
    );


  const minY =
    Math.max(
      0,
      Math.floor(
        cy -
        radius
      )
    );


  const maxY =
    Math.min(
      height - 1,
      Math.ceil(
        cy +
        radius
      )
    );


  for (
    let y = minY;
    y <= maxY;
    y++
  ) {

    for (
      let x = minX;
      x <= maxX;
      x++
    ) {

      const dx =
        x - cx;


      const dy =
        y - cy;


      if (
        dx * dx +
        dy * dy >
        radiusSq
      ) {
        continue;
      }


      totalSampled++;


      const pos =
        (
          y * width +
          x
        ) * 4;


      const type =
        classifyColor(
          data[pos],
          data[pos + 1],
          data[pos + 2],
          data[pos + 3]
        );


      if (type) {

        counts[type]++;
      }
    }
  }


  if (!totalSampled) {
    return null;
  }


  const entries = [

    ['B', counts.B],

    ['P', counts.P],

    ['T', counts.T]

  ].sort(
    (a, b) =>
      b[1] -
      a[1]
  );


  const bestType =
    entries[0][0];


  const bestCount =
    entries[0][1];


  const secondCount =
    entries[1][1];


  const coverage =
    bestCount /
    totalSampled;


  if (
    bestCount < 7 ||
    coverage < 0.025
  ) {

    return null;
  }


  if (
    secondCount > 0 &&
    bestCount <
    secondCount *
    1.18
  ) {

    const centerRadius =
      Math.max(
        3,
        radius *
        0.48
      );


    const centerRadiusSq =
      centerRadius *
      centerRadius;


    const centerCounts = {

      B:0,

      P:0,

      T:0

    };


    for (
      let y = minY;
      y <= maxY;
      y++
    ) {

      for (
        let x = minX;
        x <= maxX;
        x++
      ) {

        const dx =
          x - cx;


        const dy =
          y - cy;


        if (
          dx * dx +
          dy * dy >
          centerRadiusSq
        ) {
          continue;
        }


        const pos =
          (
            y * width +
            x
          ) * 4;


        const type =
          classifyColor(
            data[pos],
            data[pos + 1],
            data[pos + 2],
            data[pos + 3]
          );


        if (type) {

          centerCounts[type]++;
        }
      }
    }


    const centerEntries = [

      ['B', centerCounts.B],

      ['P', centerCounts.P],

      ['T', centerCounts.T]

    ].sort(
      (a, b) =>
        b[1] -
        a[1]
    );


    if (
      centerEntries[0][1] >
      centerEntries[1][1]
    ) {

      return (
        centerEntries[0][0]
      );
    }
  }


  return bestType;
}


/* =====================================================
   网格转顺序
   ===================================================== */

function gridToSequence(
  imageData,
  width,
  height,
  grid,
  normalDiameter
) {

  const sequence = [];


  const sampleRadius =
    Math.max(

      normalDiameter *
      0.52,

      Math.min(
        grid.rowSpacing,
        grid.colSpacing
      ) *
      0.34

    );


  for (
    let c = 0;
    c < grid.columns.length;
    c++
  ) {

    const cx =
      grid.columns[c];


    for (
      let r = 0;
      r < grid.rows.length;
      r++
    ) {

      const cy =
        grid.rows[r];


      const type =
        classifyGridCell(
          imageData,
          width,
          height,
          cx,
          cy,
          sampleRadius
        );


      if (type) {

        sequence.push(type);
      }
    }
  }


  return sequence;
}


/* =====================================================
   图片识别
   ===================================================== */

function recognizeRoad(img) {

  const canvas =
    byId('scanCanvas');


  if (!canvas) {

    throw new Error(
      '找不到 scanCanvas'
    );
  }


  const ctx =
    canvas.getContext(
      '2d',
      {
        willReadFrequently:true
      }
    );


  const maxWidth =
    1000;


  let w =
    img.naturalWidth ||
    img.width;


  let h =
    img.naturalHeight ||
    img.height;


  if (
    w >
    maxWidth
  ) {

    const scale =
      maxWidth / w;


    w =
      Math.round(
        w * scale
      );


    h =
      Math.round(
        h * scale
      );
  }


  canvas.width = w;

  canvas.height = h;


  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  ctx.drawImage(
    img,
    0,
    0,
    w,
    h
  );


  const imageData =
    ctx.getImageData(
      0,
      0,
      w,
      h
    );


  const components =
    findColorComponents(
      imageData,
      w,
      h
    );


  if (
    components.length < 2
  ) {

    throw new Error(
      '没有找到足够的路单圆'
    );
  }


  const normalDiameter =
    estimateNormalDiameter(
      components
    );


  const anchors =
    getGridAnchors(
      components,
      normalDiameter
    );


  if (
    anchors.length < 2
  ) {

    throw new Error(
      '无法定位路单网格'
    );
  }


  const grid =
    buildGrid(
      anchors,
      normalDiameter
    );


  if (
    !grid.rows.length ||
    !grid.columns.length
  ) {

    throw new Error(
      '无法建立路单行列'
    );
  }


  const sequence =
    gridToSequence(
      imageData,
      w,
      h,
      grid,
      normalDiameter
    );


  return {

    sequence,

    width:w,

    height:h,

    normalDiameter,

    rows:
      grid.rows.length,

    columns:
      grid.columns.length
  };
}


/* =====================================================
   截图导入
   没按Reset就一直追加
   ===================================================== */

function importRecognizedSequence(
  sequence
) {

  if (
    !sequence.length
  ) {

    throw new Error(
      '没有识别到庄闲和'
    );
  }


  const bpSequence =
    sequence.filter(
      x =>
        x === 'B' ||
        x === 'P'
    );


  const tieCount =
    sequence.filter(
      x =>
        x === 'T'
    ).length;


  if (
    !bpSequence.length
  ) {

    throw new Error(
      '没有识别到庄或闲'
    );
  }


  const beforeCount =
    gameHistory.length;


  bpSequence.forEach(
    result => {

      gameHistory.push(
        result
      );


      advanceAfterInput(
        result
      );
    }
  );


  const afterCount =
    gameHistory.length;


  renderHistory();

  renderPredictionStats();

  updateView();


  return {

    bpCount:
      bpSequence.length,

    tieCount,

    beforeCount,

    afterCount

  };
}


/* =====================================================
   图片选择
   ===================================================== */

function setupImageRecognition() {

  const input =
    byId('imageInput');


  if (!input) {
    return;
  }


  input.addEventListener(
    'change',

    function(event) {

      const file =
        event.target.files &&
        event.target.files[0];


      if (!file) {
        return;
      }


      const statusBox =
        byId('scanStatusBox');


      const status =
        byId('scanStatus');


      if (statusBox) {

        statusBox
          .classList
          .remove(
            'hidden'
          );
      }


      if (status) {

        status.textContent =
          '正在识别，请稍等……';
      }


      setButtonsDisabled(
        true
      );


      const img =
        new Image();


      const url =
        URL.createObjectURL(
          file
        );


      img.onload =
      function() {

        try {

          const result =
            recognizeRoad(
              img
            );


          if (
            !result.sequence.length
          ) {

            throw new Error(
              '没有识别到路单'
            );
          }


          const imported =
            importRecognizedSequence(
              result.sequence
            );


          if (status) {

            status.textContent =
              `✅ 本次追加 ${imported.bpCount}手 ｜ ` +
              `和 ${imported.tieCount}手 ｜ ` +
              `总历史 ${imported.afterCount}手`;
          }

        } catch (err) {

          console.error(err);


          if (status) {

            status.textContent =
              `❌ ${err.message || String(err)}`;
          }

        } finally {

          setButtonsDisabled(
            false
          );


          URL.revokeObjectURL(
            url
          );
        }
      };


      img.onerror =
      function() {

        if (status) {

          status.textContent =
            '❌ 图片读取失败';
        }


        setButtonsDisabled(
          false
        );


        URL.revokeObjectURL(
          url
        );
      };


      img.src = url;

    }
  );
}


/* =====================================================
   使用说明
   ===================================================== */

window.toggleInstructions =
function() {

  const modal =
    byId('instModal');


  const text =
    byId('instText');


  if (text) {

    text.textContent =
`使用规则：

1. 手动点击 P / B：
   直接追加到现有历史。

2. 截图识别：
   本次识别出来多少 B/P，
   就全部追加多少 B/P。

3. 手动输入和截图输入可以混合。

例如：

截图70手
+
手动输入5手
+
再次截图20手

总历史 = 95手。

4. 只有点击 Reset 才会清零。

5. T 会被识别，
   但不进入 B/P 预测历史。

6. 第91个 B/P 开始统计：

预测
命中
未中
命中率
当前连对
当前连错
最大连对
最大连错

7. 预测正确：

当前连对 +1
当前连错归0

8. 预测错误：

当前连错 +1
当前连对归0

9. Back：

删除最后一个 B/P，
并按照剩余历史重新计算。

截图颜色：

红 = B
蓝 = P
绿 = T

读取顺序：

每列从上往下，
再进入右边下一列。`;
  }


  if (modal) {

    modal
      .classList
      .remove(
        'hidden'
      );
  }
};


window.closeInstructions =
function() {

  const modal =
    byId('instModal');


  if (modal) {

    modal
      .classList
      .add(
        'hidden'
      );
  }
};


/* =====================================================
   初始化
   ===================================================== */

document.addEventListener(
  'DOMContentLoaded',

  function() {

    renderHistory();

    renderPredictionStats();


    showTextOnly(
      '就绪｜可手动输入P/B，也可以截图追加'
    );


    updateView();


    setupImageRecognition();
  }
);

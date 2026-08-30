/* =====================================================
   AI预测系统
   珠盘路纯 B/P 识别版

   截图识别规则：

   红圈 = B
   蓝圈 = P

   绿色斜杠全部忽略，
   不识别T，不统计T。

   珠盘结构：
   - 固定6行
   - 同一竖排只有一种B或P
   - 同列从上往下连续
   - 如果个别圆被绿色斜杠遮住，
     会利用整列颜色和连续结构补判

   没有按Reset：
   手动输入 + 每次截图全部继续追加。

   Reset：
   唯一清零方式。
   ===================================================== */


/* =====================================================
   预测组
   ===================================================== */

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


/* =====================================================
   历史
   ===================================================== */

let gameHistory = [];

let waiting = false;


/*
  phase

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


/* =====================================================
   第91个B/P开始统计
   ===================================================== */

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
    document.querySelectorAll('.btn');

  buttons.forEach(btn => {
    btn.disabled = disabled;
  });
}


/* =====================================================
   AI标签
   ===================================================== */

function setLabelAI() {

  const label =
    byId('resultLabel');

  if (!label) {
    return;
  }

  label.textContent = 'AI';

  label.classList.remove(
    'player',
    'banker'
  );
}


function setLabelSide(side) {

  const label =
    byId('resultLabel');

  if (!label) {
    return;
  }

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
      document.createElement('div');

    item.className =
      `record-item ${type.toLowerCase()}`;

    item.textContent = type;

    recordDisplay.appendChild(item);
  });


  const count =
    byId('historyCount');

  if (count) {
    count.textContent =
      `${gameHistory.length}手`;
  }


  /*
    自动显示最新记录
  */

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

  /*
    第91个B/P开始统计
  */

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
    ).toFixed(1)
    +
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
    virtualHandFor(realHand);


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

  /* ===================================================
     phase 0：套入
     =================================================== */

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
            '✅ 已套完24手｜开始门槛PBP';

          loopGroupIdx = 0;

          loopPos = 0;

          phase2StartRealHand = 0;
        }
      }
    }


    return;
  }


  /* ===================================================
     phase 1：PBP门槛
     =================================================== */

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


  /* ===================================================
     phase 2：正式预测
     =================================================== */

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
        )
        %
        LOOP_GROUPS.length;
    }


    renderPredictionStats();
  }
}


/* =====================================================
   当前预测显示
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
        lastGateLine
        ||
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
   Back重新计算
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


  recomputeFromHistory(old);


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

  updateView();


  const statusBox =
    byId('scanStatusBox');


  if (statusBox) {

    statusBox
      .classList
      .add('hidden');
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
        (
          (
            (g - b) /
            d
          )
          %
          6
        );

    } else if (max === g) {

      h =
        60 *
        (
          (b - r) /
          d
          +
          2
        );

    } else {

      h =
        60 *
        (
          (r - g) /
          d
          +
          4
        );
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
   像素颜色分类

   只识别：
   红 = B
   蓝 = P

   绿色全部忽略
   ===================================================== */

function classifyColor(
  r,
  g,
  b,
  a = 255
) {

  if (
    a < 100
  ) {
    return null;
  }


  const hsv =
    rgbToHSV(
      r,
      g,
      b
    );


  /*
    太灰或太暗
  */

  if (
    hsv.s < 0.22 ||
    hsv.v < 0.22
  ) {
    return null;
  }


  /* 红 = B */

  if (
    hsv.h <= 30 ||
    hsv.h >= 330
  ) {
    return 'B';
  }


  /* 蓝 = P */

  if (
    hsv.h >= 175 &&
    hsv.h <= 260
  ) {
    return 'P';
  }


  /*
    绿色以及其他颜色
    全部忽略
  */

  return null;
}


/* =====================================================
   建立红蓝Mask
   ===================================================== */

function createColorMasks(
  imageData,
  width,
  height
) {

  const total =
    width *
    height;


  const red =
    new Uint8Array(total);


  const blue =
    new Uint8Array(total);


  const data =
    imageData.data;


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


    if (
      type === 'B'
    ) {

      red[i] = 1;

    } else if (
      type === 'P'
    ) {

      blue[i] = 1;
    }
  }


  return {
    red,
    blue
  };
}


/* =====================================================
   Integral Image
   ===================================================== */

function buildIntegral(
  mask,
  width,
  height
) {

  const iw =
    width + 1;


  const integral =
    new Uint32Array(
      iw *
      (
        height + 1
      )
    );


  for (
    let y = 1;
    y <= height;
    y++
  ) {

    let rowSum = 0;


    for (
      let x = 1;
      x <= width;
      x++
    ) {

      rowSum +=
        mask[
          (
            y - 1
          )
          *
          width
          +
          (
            x - 1
          )
        ];


      integral[
        y *
        iw +
        x
      ] =
        integral[
          (
            y - 1
          )
          *
          iw +
          x
        ]
        +
        rowSum;
    }
  }


  return {
    data:
      integral,

    width:
      iw
  };
}


/* =====================================================
   矩形内颜色数量
   ===================================================== */

function rectCount(
  integral,
  x1,
  y1,
  x2,
  y2,
  width,
  height
) {

  x1 =
    Math.max(
      0,
      Math.floor(x1)
    );


  y1 =
    Math.max(
      0,
      Math.floor(y1)
    );


  x2 =
    Math.min(
      width,
      Math.ceil(x2)
    );


  y2 =
    Math.min(
      height,
      Math.ceil(y2)
    );


  if (
    x2 <= x1 ||
    y2 <= y1
  ) {
    return 0;
  }


  const iw =
    integral.width;


  const d =
    integral.data;


  return (
    d[
      y2 * iw +
      x2
    ]
    -
    d[
      y1 * iw +
      x2
    ]
    -
    d[
      y2 * iw +
      x1
    ]
    +
    d[
      y1 * iw +
      x1
    ]
  );
}


/* =====================================================
   单格红蓝像素统计
   ===================================================== */

function getCellColorCounts(
  integrals,
  cx,
  cy,
  halfW,
  halfH,
  width,
  height
) {

  const x1 =
    cx - halfW;

  const x2 =
    cx + halfW;

  const y1 =
    cy - halfH;

  const y2 =
    cy + halfH;


  return {

    red:
      rectCount(
        integrals.red,
        x1,
        y1,
        x2,
        y2,
        width,
        height
      ),

    blue:
      rectCount(
        integrals.blue,
        x1,
        y1,
        x2,
        y2,
        width,
        height
      )
  };
}


/* =====================================================
   找6行珠盘网格

   高度固定分6行，
   水平方向自动搜索格距和起点。
   ===================================================== */

function findBestGrid(
  integrals,
  width,
  height
) {

  const rows = 6;


  const rowSpacing =
    height /
    rows;


  const rowCenters = [];


  for (
    let r = 0;
    r < rows;
    r++
  ) {

    rowCenters.push(
      (
        r + 0.5
      )
      *
      rowSpacing
    );
  }


  let best = null;


  const minSpacing =
    rowSpacing *
    0.78;


  const maxSpacing =
    rowSpacing *
    1.22;


  const spacingStep =
    Math.max(
      0.35,
      rowSpacing *
      0.025
    );


  for (
    let spacing =
      minSpacing;

    spacing <=
      maxSpacing;

    spacing +=
      spacingStep
  ) {

    const phaseStep =
      Math.max(
        0.35,
        spacing /
        18
      );


    for (
      let offset = 0;

      offset <
        spacing;

      offset +=
        phaseStep
    ) {

      let score = 0;

      let detected = 0;


      const halfW =
        spacing *
        0.43;


      const halfH =
        rowSpacing *
        0.43;


      const maxCols =
        Math.ceil(
          width /
          spacing
        )
        +
        2;


      for (
        let c = 0;
        c < maxCols;
        c++
      ) {

        const cx =
          offset +
          c *
          spacing;


        if (
          cx <
            -spacing ||
          cx >
            width +
            spacing
        ) {
          continue;
        }


        let colRed = 0;

        let colBlue = 0;

        let occupied = 0;


        for (
          let r = 0;
          r < rows;
          r++
        ) {

          const counts =
            getCellColorCounts(
              integrals,
              cx,
              rowCenters[r],
              halfW,
              halfH,
              width,
              height
            );


          const main =
            Math.max(
              counts.red,
              counts.blue
            );


          if (
            main >= 3
          ) {

            occupied++;

            detected++;
          }


          colRed +=
            counts.red;


          colBlue +=
            counts.blue;
        }


        if (
          occupied > 0
        ) {

          /*
            同一竖排只有B或P一种颜色。

            主颜色越明显，
            说明网格越正确。
          */

          const dominant =
            Math.max(
              colRed,
              colBlue
            );


          const weak =
            Math.min(
              colRed,
              colBlue
            );


          score +=
            occupied *
            20;


          score +=
            dominant *
            0.20;


          score -=
            weak *
            0.12;
        }
      }


      score +=
        detected *
        8;


      if (
        !best ||
        score >
        best.score
      ) {

        best = {

          score,

          spacing,

          offset,

          rowSpacing,

          rowCenters
        };
      }
    }
  }


  if (!best) {

    throw new Error(
      '无法确定珠盘路网格'
    );
  }


  return best;
}


/* =====================================================
   建立所有列中心
   ===================================================== */

function buildColumnCenters(
  grid,
  width
) {

  const result = [];


  const spacing =
    grid.spacing;


  let first =
    grid.offset;


  while (
    first -
    spacing >
    -spacing *
    0.5
  ) {

    first -=
      spacing;
  }


  while (
    first <
    -spacing *
    0.5
  ) {

    first +=
      spacing;
  }


  for (
    let x = first;

    x <
      width +
      spacing *
      0.5;

    x +=
      spacing
  ) {

    if (
      x >=
        -spacing *
        0.2 &&
      x <=
        width +
        spacing *
        0.2
    ) {

      result.push(x);
    }
  }


  return result;
}


/* =====================================================
   分析一整列

   重点：

   同一竖排只能是一种B/P。

   如果中间某格颜色太弱，
   但下面仍然有同色结果，
   就根据整列结构补回来。
   ===================================================== */

function analyseColumn(
  integrals,
  cx,
  grid,
  width,
  height
) {

  const rows = 6;


  const cellInfo = [];


  let totalRed = 0;

  let totalBlue = 0;


  const halfW =
    grid.spacing *
    0.44;


  const halfH =
    grid.rowSpacing *
    0.44;


  for (
    let r = 0;
    r < rows;
    r++
  ) {

    const counts =
      getCellColorCounts(
        integrals,
        cx,
        grid.rowCenters[r],
        halfW,
        halfH,
        width,
        height
      );


    totalRed +=
      counts.red;


    totalBlue +=
      counts.blue;


    cellInfo.push(counts);
  }


  const dominant =
    Math.max(
      totalRed,
      totalBlue
    );


  /*
    空列
  */

  if (
    dominant < 6
  ) {

    return {
      empty:true
    };
  }


  /*
    整列先确定B/P
  */

  const side =
    totalRed >=
    totalBlue
      ? 'B'
      : 'P';


  const strongThreshold = 3;


  let lastStrongRow = -1;


  for (
    let r = 0;
    r < rows;
    r++
  ) {

    const sameColor =
      side === 'B'
        ?
        cellInfo[r].red
        :
        cellInfo[r].blue;


    if (
      sameColor >=
      strongThreshold
    ) {

      lastStrongRow = r;
    }
  }


  if (
    lastStrongRow < 0
  ) {

    return {
      empty:true
    };
  }


  return {

    empty:false,

    side,

    lastRow:
      lastStrongRow,

    cellInfo,

    totalRed,

    totalBlue
  };
}


/* =====================================================
   读取完整珠盘路

   每列：
   上 -> 下

   再进入右边下一列。

   只输出 B/P。
   ===================================================== */

function readRoadGrid(
  integrals,
  grid,
  width,
  height
) {

  const columns =
    buildColumnCenters(
      grid,
      width
    );


  const analysed = [];


  columns.forEach(cx => {

    analysed.push({

      cx,

      result:
        analyseColumn(
          integrals,
          cx,
          grid,
          width,
          height
        )
    });
  });


  /*
    找最后有效列
  */

  let lastValid = -1;


  for (
    let i = 0;
    i < analysed.length;
    i++
  ) {

    if (
      !analysed[i]
        .result
        .empty
    ) {

      lastValid = i;
    }
  }


  if (
    lastValid < 0
  ) {

    throw new Error(
      '没有识别到珠盘路结果'
    );
  }


  /*
    找第一有效列
  */

  let firstValid = 0;


  while (
    firstValid <=
      lastValid &&
    analysed[
      firstValid
    ].result.empty
  ) {

    firstValid++;
  }


  const sequence = [];


  let repairedCount = 0;


  for (
    let c =
      firstValid;

    c <=
      lastValid;

    c++
  ) {

    const column =
      analysed[c];


    const info =
      column.result;


    if (
      info.empty
    ) {

      /*
        整列完全空就跳过。
        不自动凭空猜整列。
      */

      continue;
    }


    const side =
      info.side;


    /*
      从第一格读到本列最后明显结果。

      中间如果颜色弱，
      根据同列同色结构补回来。
  */

    for (
      let r = 0;
      r <=
        info.lastRow;
      r++
    ) {

      const counts =
        info.cellInfo[r];


      const sameColor =
        side === 'B'
          ?
          counts.red
          :
          counts.blue;


      if (
        sameColor < 3
      ) {

        repairedCount++;
      }


      sequence.push(side);
    }
  }


  return {

    sequence,

    bpCount:
      sequence.length,

    repairedCount,

    firstColumn:
      firstValid,

    lastColumn:
      lastValid
  };
}


/* =====================================================
   截图识别

   只识别红/蓝。
   完全不处理绿色。
   ===================================================== */

function recognizeRoad(img) {

  const canvas =
    byId('scanCanvas');


  if (!canvas) {

    throw new Error(
      '找不到scanCanvas'
    );
  }


  const ctx =
    canvas.getContext(
      '2d',
      {
        willReadFrequently:true
      }
    );


  /*
    小珠盘截图尽量保持原图，
    只有特别大才缩小。
  */

  const maxWidth = 1400;


  let w =
    img.naturalWidth
    ||
    img.width;


  let h =
    img.naturalHeight
    ||
    img.height;


  if (
    w >
    maxWidth
  ) {

    const scale =
      maxWidth /
      w;


    w =
      Math.round(
        w *
        scale
      );


    h =
      Math.round(
        h *
        scale
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


  /*
    1.
    只建立红蓝Mask
  */

  const masks =
    createColorMasks(
      imageData,
      w,
      h
    );


  /*
    2.
    Integral
  */

  const integrals = {

    red:
      buildIntegral(
        masks.red,
        w,
        h
      ),

    blue:
      buildIntegral(
        masks.blue,
        w,
        h
      )
  };


  /*
    3.
    找固定6行珠盘网格
  */

  const grid =
    findBestGrid(
      integrals,
      w,
      h
    );


  /*
    4.
    按整列规则读取B/P
  */

  const read =
    readRoadGrid(
      integrals,
      grid,
      w,
      h
    );


  return {

    sequence:
      read.sequence,

    bpCount:
      read.bpCount,

    repairedCount:
      read.repairedCount,

    width:w,

    height:h,

    spacing:
      grid.spacing,

    rowSpacing:
      grid.rowSpacing
  };
}


/* =====================================================
   导入截图结果

   现在只有 B / P。
   没有T。
   ===================================================== */

function importRecognizedSequence(
  sequence
) {

  if (
    !sequence.length
  ) {

    throw new Error(
      '没有识别到庄或闲'
    );
  }


  const bpSequence =
    sequence.filter(
      x =>
        x === 'B' ||
        x === 'P'
    );


  if (
    !bpSequence.length
  ) {

    throw new Error(
      '没有识别到庄或闲'
    );
  }


  const beforeCount =
    gameHistory.length;


  /*
    没按Reset：
    永远继续追加。
  */

  bpSequence.forEach(
    result => {

      gameHistory.push(result);

      advanceAfterInput(result);
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

    beforeCount,

    afterCount
  };
}


/* =====================================================
   图片选择事件
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
        event.target.files
        &&
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
          .remove('hidden');
      }


      if (status) {

        status.textContent =
          '正在识别珠盘路 B/P……';
      }


      setButtonsDisabled(true);


      const img =
        new Image();


      const url =
        URL.createObjectURL(file);


      img.onload =
      function() {

        try {

          const result =
            recognizeRoad(img);


          if (
            !result.sequence.length
          ) {

            throw new Error(
              '没有识别到珠盘路'
            );
          }


          const imported =
            importRecognizedSequence(
              result.sequence
            );


          if (status) {

            status.textContent =
              `✅ 珠盘路识别完成 ｜ ` +
              `本次追加 ${imported.bpCount}手 ｜ ` +
              `总历史 ${imported.afterCount}手` +
              (
                result.repairedCount
                  ?
                  ` ｜ 自动补回${result.repairedCount}个弱格`
                  :
                  ''
              );
          }

        } catch (err) {

          console.error(err);


          if (status) {

            status.textContent =
              `❌ ${err.message || String(err)}`;
          }

        } finally {

          setButtonsDisabled(false);


          URL.revokeObjectURL(url);
        }
      };


      img.onerror =
      function() {

        if (status) {

          status.textContent =
            '❌ 图片读取失败';
        }


        setButtonsDisabled(false);


        URL.revokeObjectURL(url);
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

【截图识别】

以后只截图珠盘路区域。

程序现在只识别：

红圈 = B
蓝圈 = P

绿色斜杠全部忽略。

不识别和，
不统计和，
也不会因为绿色斜杠增加手数。


珠盘路固定6行。

同一竖排只会是一种结果：

整列B
或者
整列P

不会同一列B/P混合。


程序会先判断整列是B还是P，
再从上往下读取。

如果某一个红圈或蓝圈
被绿色斜杠遮住一部分，

但这一列上下结构证明
这一格应该存在，

程序会按照整列B/P
自动把弱格补回来。


【追加规则】

只要没有点击Reset：

截图识别出的所有B/P
继续追加到历史。

手动点击P/B
也继续追加。


例如：

截图67手
+
手动5手
+
再截图20手

总历史 = 92手。


【统计】

第91个B/P开始统计：

预测
命中
未中
命中率

当前连对
当前连错

最大连对
最大连错


【Back】

删除最后一个B/P，

然后根据剩余历史
全部重新计算。


【Reset】

Reset是唯一清零方式。

会清空：

历史
套入状态
门槛状态
预测状态
统计
当前连对
当前连错
最大连对
最大连错。`;
  }


  if (modal) {

    modal
      .classList
      .remove('hidden');
  }
};


/* =====================================================
   关闭说明
   ===================================================== */

window.closeInstructions =
function() {

  const modal =
    byId('instModal');


  if (modal) {

    modal
      .classList
      .add('hidden');
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

    updateView();

    setupImageRecognition();
  }
);

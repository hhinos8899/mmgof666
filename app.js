/* =====================================================
   AI预测系统
   路单截图识别 V8

   识别规则：

   1. 路单固定6行
   2. 每一竖列只能是一种结果：
      红 = B
      蓝 = P

   3. 同一竖列不会B/P混合
   4. 同列从上往下连续
   5. 如果中间某格颜色被绿杠挡住，
      根据整列颜色和连续结构补回来

   6. 绿色斜杠：
      1条 = 1个T
      2条 = 2个T
      3条 = 3个T

   7. T不进入B/P预测历史

   8. 没有按Reset：
      手动输入 + 每次截图全部继续追加
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
   按钮
   ===================================================== */

function setButtonsDisabled(
  disabled
) {

  const buttons =
    document.querySelectorAll(
      '.btn'
    );


  buttons.forEach(
    btn => {

      btn.disabled =
        disabled;
    }
  );
}


/* =====================================================
   标签
   ===================================================== */

function setLabelAI() {

  const label =
    byId('resultLabel');


  if (!label) {
    return;
  }


  label.textContent =
    'AI';


  label.classList.remove(
    'player',
    'banker'
  );
}


function setLabelSide(
  side
) {

  const label =
    byId('resultLabel');


  if (!label) {
    return;
  }


  label.textContent =
    side;


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


function showTextOnly(
  msg
) {

  setLabelAI();


  const text =
    byId(
      'predictionText'
    );


  if (text) {

    text.textContent =
      msg;
  }
}


/* =====================================================
   历史
   ===================================================== */

function renderHistory() {

  const recordDisplay =
    byId(
      'recordDisplay'
    );


  if (!recordDisplay) {
    return;
  }


  recordDisplay.innerHTML =
    '';


  gameHistory.forEach(
    type => {

      const item =
        document.createElement(
          'div'
        );


      item.className =
        `record-item ${type.toLowerCase()}`;


      item.textContent =
        type;


      recordDisplay.appendChild(
        item
      );
    }
  );


  const count =
    byId(
      'historyCount'
    );


  if (count) {

    count.textContent =
      `${gameHistory.length}手`;
  }


  requestAnimationFrame(
    () => {

      recordDisplay.scrollTop =
        recordDisplay.scrollHeight;
    }
  );
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

function virtualHandFor(
  realHand
) {

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


function fmtHand(
  realHand
) {

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

function advanceAfterInput(
  actual
) {

  /* =========================
     phase 0
     ========================= */

  if (phase === 0) {

    const need =
      GROUPS[
        matchIdx
      ];


    if (
      actual ===
      need[
        phase0Cursor
      ]
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


  /* =========================
     phase 1
     ========================= */

  if (phase === 1) {

    const pred =
      "PBP"[
        gateStep
      ];


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


  /* =========================
     phase 2
     ========================= */

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
   页面显示
   ===================================================== */

function updateView() {

  const upcomingReal =
    gameHistory.length + 1;


  if (phase === 0) {

    const need =
      GROUPS[
        matchIdx
      ];


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
      byId(
        'predictionText'
      );


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
    byId(
      'predictionText'
    );


  if (text) {

    text.textContent =
      `${fmtHand(upcomingReal)}｜` +
      `当前组 ${g}｜` +
      `第${loopPos + 1}/3｜` +
      `预测 ${p}`;
  }
}


/* =====================================================
   重新计算
   ===================================================== */

function recomputeFromHistory(
  arr
) {

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


  arr.forEach(
    x => {

      gameHistory.push(x);

      advanceAfterInput(x);
    }
  );


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


  setButtonsDisabled(
    true
  );


  gameHistory.push(
    type
  );


  advanceAfterInput(
    type
  );


  renderHistory();

  renderPredictionStats();

  updateView();


  waiting = false;


  setButtonsDisabled(
    false
  );
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
    [
      ...gameHistory
    ];


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


  recomputeFromHistory(
    []
  );


  renderHistory();

  renderPredictionStats();

  updateView();


  const statusBox =
    byId(
      'scanStatusBox'
    );


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
    byId(
      'imageInput'
    );


  if (!input) {
    return;
  }


  input.value =
    '';


  input.click();
};


/* =====================================================
   RGB -> HSV
   ===================================================== */

function rgbToHSV(
  r,
  g,
  b
) {

  r /= 255;

  g /= 255;

  b /= 255;


  const max =
    Math.max(
      r,
      g,
      b
    );


  const min =
    Math.min(
      r,
      g,
      b
    );


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

    } else if (
      max === g
    ) {

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
   像素颜色

   红=B
   蓝=P
   绿=T标记
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
    太灰、太暗
  */

  if (
    hsv.s < 0.22 ||
    hsv.v < 0.22
  ) {

    return null;
  }


  /* 红 */

  if (
    hsv.h <= 30 ||
    hsv.h >= 330
  ) {

    return 'B';
  }


  /* 蓝 */

  if (
    hsv.h >= 175 &&
    hsv.h <= 260
  ) {

    return 'P';
  }


  /* 绿 */

  if (
    hsv.h >= 55 &&
    hsv.h <= 180
  ) {

    return 'T';
  }


  return null;
}


/* =====================================================
   建颜色Mask
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
    new Uint8Array(
      total
    );


  const blue =
    new Uint8Array(
      total
    );


  const green =
    new Uint8Array(
      total
    );


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

    } else if (
      type === 'T'
    ) {

      green[i] = 1;
    }
  }


  return {

    red,

    blue,

    green
  };
}


/* =====================================================
   Integral Image
   快速统计一个矩形区域颜色数量
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
   计算单格红蓝数量
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
      ),

    green:
      rectCount(
        integrals.green,
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
   找最合适的珠盘/路单网格

   固定6行。

   水平方向搜索最匹配的格距和起点。
   ===================================================== */

function findBestGrid(
  integrals,
  width,
  height
) {

  const rows = 6;


  /*
    截图只截路单区域，
    所以高度基本就是6格。
  */

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


  let best =
    null;


  /*
    横向格距一般和纵向接近。

    允许稍微有缩放。
  */

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


      const half =
        spacing *
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
              half,
              rowSpacing *
                0.43,
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
            同一竖排应该只有一种B/P。

            红蓝差距越明显，
            网格越可能正确。
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


      /*
        有识别结果越多越好
      */

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
      '无法确定路单网格'
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


  /*
    把offset调整到第一个可能进入画面的格心
  */

  let first =
    grid.offset;


  while (
    first -
    spacing >
    -spacing * 0.5
  ) {

    first -=
      spacing;
  }


  while (
    first <
    -spacing * 0.5
  ) {

    first +=
      spacing;
  }


  for (
    let x = first;

    x <
      width +
      spacing * 0.5;

    x +=
      spacing
  ) {

    if (
      x >=
        -spacing * 0.2 &&
      x <=
        width +
        spacing * 0.2
    ) {

      result.push(x);
    }
  }


  return result;
}


/* =====================================================
   分析一整列

   关键：

   同一竖排只能是B或者P。

   不允许同列红蓝混用。
   ===================================================== */

function analyseColumn(
  integrals,
  cx,
  grid,
  width,
  height
) {

  const rows =
    6;


  const cellInfo =
    [];


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


    cellInfo.push(
      counts
    );
  }


  const dominant =
    Math.max(
      totalRed,
      totalBlue
    );


  /*
    这一列完全没结果
  */

  if (
    dominant <
    6
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


  /*
    再确定这一列到第几格。

    因为一列从上往下连续，
    所以只要下面还有明显主体，
    中间弱掉的一格不能直接删除。
  */

  let lastStrongRow =
    -1;


  const strongThreshold =
    3;


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

      lastStrongRow =
        r;
    }
  }


  if (
    lastStrongRow <
    0
  ) {

    return {

      empty:true
    };
  }


  /*
    结构校验：

    如果第0格非常弱，
    但下面有明显同色，
    仍然按这一列存在处理。

    这样绿色斜杠挡住主体
    也不会把整手吃掉。
  */

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
   绿色斜杠识别

   一格里专门数绿色线条。
   ===================================================== */

function countGreenBarsInCell(
  greenMask,
  width,
  height,
  cx,
  cy,
  cellW,
  cellH
) {

  const halfW =
    cellW *
    0.49;


  const halfH =
    cellH *
    0.49;


  const minX =
    Math.max(
      0,
      Math.floor(
        cx -
        halfW
      )
    );


  const maxX =
    Math.min(
      width - 1,
      Math.ceil(
        cx +
        halfW
      )
    );


  const minY =
    Math.max(
      0,
      Math.floor(
        cy -
        halfH
      )
    );


  const maxY =
    Math.min(
      height - 1,
      Math.ceil(
        cy +
        halfH
      )
    );


  const localW =
    maxX -
    minX +
    1;


  const localH =
    maxY -
    minY +
    1;


  const local =
    new Uint8Array(
      localW *
      localH
    );


  let totalGreen = 0;


  /*
    建局部绿色mask
  */

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

      const src =
        y *
        width +
        x;


      if (
        greenMask[src]
      ) {

        const lx =
          x -
          minX;


        const ly =
          y -
          minY;


        local[
          ly *
          localW +
          lx
        ] = 1;


        totalGreen++;
      }
    }
  }


  /*
    没有绿色
  */

  if (
    totalGreen <
    2
  ) {

    return 0;
  }


  const visited =
    new Uint8Array(
      local.length
    );


  const stack = [];


  const components = [];


  for (
    let start = 0;
    start <
      local.length;
    start++
  ) {

    if (
      !local[start] ||
      visited[start]
    ) {

      continue;
    }


    visited[start] = 1;


    stack.length = 0;


    stack.push(
      start
    );


    let area = 0;


    let minGX =
      localW;


    let maxGX = 0;


    let minGY =
      localH;


    let maxGY = 0;


    while (
      stack.length
    ) {

      const cur =
        stack.pop();


      const gy =
        Math.floor(
          cur /
          localW
        );


      const gx =
        cur -
        gy *
        localW;


      area++;


      minGX =
        Math.min(
          minGX,
          gx
        );


      maxGX =
        Math.max(
          maxGX,
          gx
        );


      minGY =
        Math.min(
          minGY,
          gy
        );


      maxGY =
        Math.max(
          maxGY,
          gy
        );


      /*
        8方向连接，
        斜线不会被拆开。
      */

      for (
        let oy = -1;
        oy <= 1;
        oy++
      ) {

        for (
          let ox = -1;
          ox <= 1;
          ox++
        ) {

          if (
            ox === 0 &&
            oy === 0
          ) {

            continue;
          }


          const nx =
            gx +
            ox;


          const ny =
            gy +
            oy;


          if (
            nx < 0 ||
            nx >= localW ||
            ny < 0 ||
            ny >= localH
          ) {

            continue;
          }


          const ni =
            ny *
            localW +
            nx;


          if (
            local[ni] &&
            !visited[ni]
          ) {

            visited[ni] =
              1;


            stack.push(
              ni
            );
          }
        }
      }
    }


    const bw =
      maxGX -
      minGX +
      1;


    const bh =
      maxGY -
      minGY +
      1;


    const longSide =
      Math.max(
        bw,
        bh
      );


    /*
      很小的绿点忽略
  */

    if (
      area >= 2 &&
      longSide >=
      Math.max(
        2,
        cellH *
        0.20
      )
    ) {

      components.push({

        area,

        bw,

        bh,

        longSide
      });
    }
  }


  if (
    !components.length
  ) {

    return 0;
  }


  /*
    正常情况下：
    一个连通块≈一条绿色斜杠
  */

  let bars =
    components.length;


  /*
    两条斜杠如果靠太近，
    可能粘成一个连通块。

    根据绿色面积再补判一次。
  */

  if (
    components.length === 1
  ) {

    const c =
      components[0];


    const cellArea =
      cellW *
      cellH;


    const ratio =
      c.area /
      cellArea;


    if (
      ratio >
      0.115
    ) {

      bars = 2;
    }


    if (
      ratio >
      0.19
    ) {

      bars = 3;
    }
  }


  /*
    最多允许5个连续和
  */

  return Math.min(
    bars,
    5
  );
}


/* =====================================================
   路单完整读取

   按：
   左 -> 右

   每一列：
   上 -> 下
   ===================================================== */

function readRoadGrid(
  masks,
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


  /*
    先分析所有列
  */

  columns.forEach(
    cx => {

      analysed.push(
        {
          cx,
          result:
            analyseColumn(
              integrals,
              cx,
              grid,
              width,
              height
            )
        }
      );
    }
  );


  /*
    找最后一个有效列
  */

  let lastValid =
    -1;


  for (
    let i = 0;
    i <
      analysed.length;
    i++
  ) {

    if (
      !analysed[
        i
      ].result.empty
    ) {

      lastValid =
        i;
    }
  }


  if (
    lastValid <
    0
  ) {

    throw new Error(
      '没有识别到路单结果'
    );
  }


  /*
    左边可能因为截图边缘
    有少量空列，
    找第一有效列
  */

  let firstValid =
    0;


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


  let bpCount = 0;

  let tieCount = 0;

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


    /*
      如果中间整列完全空，
      暂时跳过。

      不自动猜整列。
  */

    if (
      info.empty
    ) {

      continue;
    }


    const side =
      info.side;


    /*
      从第0格一直读取到
      该列最后一个明显结果。

      中间弱掉的格子根据
      “同列同B/P + 连续”
      自动补回来。
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


      /*
        如果主体特别弱，
        说明这一格是靠列结构补回来的。
  */

      if (
        sameColor < 3
      ) {

        repairedCount++;
      }


      sequence.push(
        side
      );


      bpCount++;


      /*
        单独读取这一格绿色杠
  */

      const ties =
        countGreenBarsInCell(
          masks.green,
          width,
          height,
          column.cx,
          grid.rowCenters[r],
          grid.spacing,
          grid.rowSpacing
        );


      for (
        let t = 0;
        t < ties;
        t++
      ) {

        sequence.push(
          'T'
        );


        tieCount++;
      }
    }
  }


  return {

    sequence,

    bpCount,

    tieCount,

    repairedCount,

    firstColumn:
      firstValid,

    lastColumn:
      lastValid
  };
}


/* =====================================================
   截图识别
   ===================================================== */

function recognizeRoad(
  img
) {

  const canvas =
    byId(
      'scanCanvas'
    );


  if (!canvas) {

    throw new Error(
      '找不到scanCanvas'
    );
  }


  const ctx =
    canvas.getContext(
      '2d',
      {
        willReadFrequently:
          true
      }
    );


  const maxWidth =
    1400;


  let w =
    img.naturalWidth
    ||
    img.width;


  let h =
    img.naturalHeight
    ||
    img.height;


  /*
    太宽才缩小。

    这种小路单尽量保持原图，
    对绿色斜杠识别更准确。
  */

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


  canvas.width =
    w;


  canvas.height =
    h;


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
    建红蓝绿三张Mask
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
      ),

    green:
      buildIntegral(
        masks.green,
        w,
        h
      )
  };


  /*
    3.
    找6行固定网格
  */

  const grid =
    findBestGrid(
      integrals,
      w,
      h
    );


  /*
    4.
    整列识别
  */

  const read =
    readRoadGrid(
      masks,
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

    tieCount:
      read.tieCount,

    repairedCount:
      read.repairedCount,

    width:
      w,

    height:
      h,

    spacing:
      grid.spacing,

    rowSpacing:
      grid.rowSpacing
  };
}


/* =====================================================
   导入识别结果

   T不进入预测历史。

   B/P全部追加。
   ===================================================== */

function importRecognizedSequence(
  sequence
) {

  if (
    !sequence.length
  ) {

    throw new Error(
      '没有识别到开奖结果'
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


  /*
    永远追加
  */

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

    afterCount,

    totalRoundCount:
      bpSequence.length +
      tieCount
  };
}


/* =====================================================
   图片选择
   ===================================================== */

function setupImageRecognition() {

  const input =
    byId(
      'imageInput'
    );


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
        byId(
          'scanStatusBox'
        );


      const status =
        byId(
          'scanStatus'
        );


      if (statusBox) {

        statusBox
          .classList
          .remove(
            'hidden'
          );
      }


      if (status) {

        status.textContent =
          '正在按6行整列规则识别……';
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
              `✅ 本次B/P ${imported.bpCount}手 ｜ ` +
              `和 ${imported.tieCount}手 ｜ ` +
              `总局 ${imported.totalRoundCount}局 ｜ ` +
              `历史累计 ${imported.afterCount}手` +
              (
                result.repairedCount
                  ?
                  ` ｜ 自动补回${result.repairedCount}个弱格`
                  :
                  ''
              );
          }

        } catch (
          err
        ) {

          console.error(
            err
          );


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


      img.src =
        url;
    }
  );
}


/* =====================================================
   使用说明
   ===================================================== */

window.toggleInstructions =
function() {

  const modal =
    byId(
      'instModal'
    );


  const text =
    byId(
      'instText'
    );


  if (text) {

    text.textContent =
`截图识别规则：

只截图你现在使用的这块路单。

固定6行。

同一竖排只会是一种结果：

红圈 = B
蓝圈 = P

同一竖排不会B/P混在一起。

程序会先判断整列是B还是P，
再从上往下读取。

如果某个圆被绿色和杠挡住，
但这一列上下结构证明这一格存在，
程序会按同列B/P自动补回，
避免漏掉一手。


绿色斜杠：

1条 = 1个和
2条 = 2个和
3条 = 3个和


T不会进入B/P预测历史。


截图追加：

只要没有按Reset，
每次截图识别出的B/P
全部继续追加到历史。

手动输入的P/B
也一样继续追加。


Back：

删除最后一个B/P，
然后重新计算。


Reset：

唯一清零方式。


第91个B/P开始统计：

预测
命中
未中
命中率
当前连对
当前连错
最大连对
最大连错。`;
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
    byId(
      'instModal'
    );


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

    updateView();

    setupImageRecognition();
  }
);

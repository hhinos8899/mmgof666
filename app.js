/* =====================================================
   AI 预测系统
   app.js V14 最终稳定版

   截图识别：

   红圈 = B
   蓝圈 = P
   绿色全部忽略

   原则：
   1. 不识别和
   2. 不自动补空格
   3. 不自动补弱格
   4. 不按6格强行增加手数
   5. 真实检测到红/蓝才算一手
   6. 同一竖排颜色只辅助判断 B/P
   7. 过滤最左边明显的小残片
   8. 检查第一列是否为重复假列
      专门修复：
      49手被识别成50手、
      开头多一个P的问题
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
   全局状态
   ===================================================== */

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


/* =====================================================
   按钮状态
   ===================================================== */

function setButtonsDisabled(disabled) {

  const buttons =
    document.querySelectorAll(
      '.btn'
    );


  buttons.forEach(btn => {

    btn.disabled =
      disabled;
  });
}


/* =====================================================
   当前预测标签
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


function setLabelSide(side) {

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


function showTextOnly(msg) {

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
   历史显示
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


  gameHistory.forEach(type => {

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
  });


  const count =
    byId(
      'historyCount'
    );


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
   统计清零
   ===================================================== */

function resetPredictionStats() {

  predictionTotal = 0;

  predictionHits = 0;

  currentWinStreak = 0;

  currentLoseStreak = 0;

  maxWinStreak = 0;

  maxLoseStreak = 0;
}


/* =====================================================
   统计预测
   ===================================================== */

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


/* =====================================================
   命中率
   ===================================================== */

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


/* =====================================================
   更新统计
   ===================================================== */

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
   当前显示
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
   根据历史重算
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
    max -
    min;


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
   颜色分类

   红 = B
   蓝 = P

   绿色完全忽略
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


  if (
    hsv.s < 0.23 ||
    hsv.v < 0.24
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
    hsv.h <= 262
  ) {

    return 'P';
  }


  return null;
}


/* =====================================================
   红蓝Mask
   ===================================================== */

function createSideMasks(
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
   找单颜色连通块
   ===================================================== */

function findMaskComponents(
  mask,
  width,
  height,
  side
) {

  const total =
    width *
    height;


  const visited =
    new Uint8Array(
      total
    );


  const result = [];

  const stack = [];


  const minArea =
    Math.max(
      3,
      Math.floor(
        total *
        0.0000015
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


    stack.push(
      start
    );


    let area = 0;

    let sumX = 0;

    let sumY = 0;


    let minX =
      width;

    let maxX = 0;

    let minY =
      height;

    let maxY = 0;


    while (
      stack.length
    ) {

      const cur =
        stack.pop();


      const y =
        Math.floor(
          cur /
          width
        );


      const x =
        cur -
        y *
        width;


      area++;

      sumX += x;

      sumY += y;


      minX =
        Math.min(
          minX,
          x
        );


      maxX =
        Math.max(
          maxX,
          x
        );


      minY =
        Math.min(
          minY,
          y
        );


      maxY =
        Math.max(
          maxY,
          y
        );


      /*
        8方向连接
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
            x + ox;


          const ny =
            y + oy;


          if (
            nx < 0 ||
            nx >= width ||
            ny < 0 ||
            ny >= height
          ) {

            continue;
          }


          const ni =
            ny *
            width +
            nx;


          if (
            mask[ni] &&
            !visited[ni]
          ) {

            visited[ni] = 1;


            stack.push(
              ni
            );
          }
        }
      }
    }


    if (
      area <
      minArea
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
      bw < 2 ||
      bh < 2
    ) {

      continue;
    }


    result.push({

      side,

      area,

      x:
        sumX /
        area,

      y:
        sumY /
        area,

      minX,

      maxX,

      minY,

      maxY,

      width:
        bw,

      height:
        bh
    });
  }


  return result;
}


/* =====================================================
   中位数
   ===================================================== */

function median(arr) {

  if (
    !arr.length
  ) {

    return 0;
  }


  const values =
    [...arr]
      .sort(
        (a, b) =>
          a - b
      );


  const middle =
    Math.floor(
      values.length /
      2
    );


  if (
    values.length %
    2
  ) {

    return values[
      middle
    ];
  }


  return (
    values[
      middle - 1
    ]
    +
    values[
      middle
    ]
  )
  /
  2;
}


/* =====================================================
   估算正常圆大小
   ===================================================== */

function estimateMarkerSize(
  components
) {

  const sizes =
    components
      .map(c =>

        Math.max(
          c.width,
          c.height
        )
      )
      .filter(size =>

        size >= 3
      )
      .sort(
        (a, b) =>
          a - b
      );


  if (
    !sizes.length
  ) {

    return 12;
  }


  const start =
    Math.floor(
      sizes.length *
      0.35
    );


  const usable =
    sizes.slice(
      start
    );


  return (
    median(usable)
    ||
    median(sizes)
    ||
    12
  );
}


/* =====================================================
   过滤明显噪点

   只额外处理最左边小残片。
   ===================================================== */

function filterComponents(
  components,
  markerSize
) {

  const minArea =
    Math.max(
      3,
      markerSize *
      markerSize *
      0.018
    );


  const maxSize =
    markerSize *
    1.9;


  const leftEdge =
    markerSize *
    0.45;


  return components.filter(c => {

    const big =
      Math.max(
        c.width,
        c.height
      );


    if (
      big >
      maxSize
    ) {

      return false;
    }


    if (
      c.area <
      minArea
    ) {

      return false;
    }


    /*
      最左侧只有明显小残片时才删除。

      正常第一手不动。
    */

    if (
      c.minX <
      leftEdge &&
      (
        c.width <
        markerSize *
        0.38
        ||
        c.area <
        markerSize *
        markerSize *
        0.055
      )
    ) {

      return false;
    }


    return true;
  });
}


/* =====================================================
   数字聚类
   ===================================================== */

function clusterNumbers(
  items,
  getValue,
  tolerance
) {

  if (
    !items.length
  ) {

    return [];
  }


  const sorted =
    [...items]
      .sort(
        (a, b) =>
          getValue(a) -
          getValue(b)
      );


  const groups = [];


  sorted.forEach(item => {

    const value =
      getValue(item);


    let best =
      null;


    let bestDistance =
      Infinity;


    groups.forEach(group => {

      const distance =
        Math.abs(
          value -
          group.center
        );


      if (
        distance <=
        tolerance &&
        distance <
        bestDistance
      ) {

        best =
          group;


        bestDistance =
          distance;
      }
    });


    if (!best) {

      groups.push({

        center:
          value,

        items:
          [item]
      });


      return;
    }


    best.items.push(
      item
    );


    let weightTotal = 0;

    let weighted = 0;


    best.items.forEach(x => {

      const weight =
        Math.max(
          1,
          x.area || 1
        );


      weighted +=
        getValue(x) *
        weight;


      weightTotal +=
        weight;
    });


    best.center =
      weighted /
      weightTotal;
  });


  groups.sort(
    (a, b) =>
      a.center -
      b.center
  );


  return groups;
}


/* =====================================================
   同一竖列内整理真实圆

   不补任何不存在的格子。
   ===================================================== */

function buildCellsForColumn(
  column,
  markerSize
) {

  const yTolerance =
    Math.max(
      4,
      markerSize *
      0.70
    );


  const rows =
    clusterNumbers(
      column.items,
      item =>
        item.y,
      yTolerance
    );


  const cells = [];


  rows.forEach(row => {

    let redArea = 0;

    let blueArea = 0;

    let totalArea = 0;

    let weightedX = 0;

    let weightedY = 0;


    row.items.forEach(item => {

      totalArea +=
        item.area;


      weightedX +=
        item.x *
        item.area;


      weightedY +=
        item.y *
        item.area;


      if (
        item.side === 'B'
      ) {

        redArea +=
          item.area;

      } else {

        blueArea +=
          item.area;
      }
    });


    if (
      totalArea <= 0
    ) {

      return;
    }


    cells.push({

      x:
        weightedX /
        totalArea,

      y:
        weightedY /
        totalArea,

      area:
        totalArea,

      redArea,

      blueArea
    });
  });


  cells.sort(
    (a, b) =>
      a.y -
      b.y
  );


  return cells;
}


/* =====================================================
   根据真实红蓝标记建立真实竖列

   不生成空列。
   不补格。
   ===================================================== */

function buildRealColumns(
  components,
  markerSize
) {

  const xTolerance =
    Math.max(
      4,
      markerSize *
      0.70
    );


  const rawColumns =
    clusterNumbers(
      components,
      item =>
        item.x,
      xTolerance
    );


  const columns = [];


  rawColumns.forEach(group => {

    const cells =
      buildCellsForColumn(
        group,
        markerSize
      );


    if (
      !cells.length
    ) {

      return;
    }


    /*
      珠盘一竖排最多6手。
    */

    if (
      cells.length >
      6
    ) {

      throw new Error(
        '识别到某一竖排超过6手，请重新裁剪珠盘路截图'
      );
    }


    let redArea = 0;

    let blueArea = 0;


    cells.forEach(cell => {

      redArea +=
        cell.redArea;


      blueArea +=
        cell.blueArea;
    });


    const dominant =
      Math.max(
        redArea,
        blueArea
      );


    const weak =
      Math.min(
        redArea,
        blueArea
      );


    if (
      dominant <= 0
    ) {

      return;
    }


    /*
      同一竖排只有一种主体颜色。

      红蓝太接近就停止，
      不乱猜。
    */

    if (
      weak > 0 &&
      dominant <
      weak *
      1.12
    ) {

      throw new Error(
        '有一竖排红蓝判断不清，请换清晰截图重新识别'
      );
    }


    const side =
      redArea >=
      blueArea
        ?
        'B'
        :
        'P';


    columns.push({

      x:
        group.center,

      side,

      cells
    });
  });


  columns.sort(
    (a, b) =>
      a.x -
      b.x
  );


  return columns;
}


/* =====================================================
   第一列重复假列检查

   专门修复：

   实际49手
   程序50手

   开头：
   P P B ...

   实际应该：
   P B ...

   判断依据：

   1. 第一列只有1手
   2. 第一列到第二列的距离
      明显小于后面的正常列距

   满足两个条件，
   才删除第一列。

   不按颜色直接删，
   不按固定位置直接删。
   ===================================================== */

function removeFalseFirstColumn(
  columns
) {

  if (
    columns.length <
    3
  ) {

    return columns;
  }


  /*
    从第二列开始计算正常列距。

    不把第一个可疑距离
    加入正常距离计算。
  */

  const gaps = [];


  for (
    let i = 1;
    i < columns.length - 1;
    i++
  ) {

    const gap =
      columns[i + 1].x -
      columns[i].x;


    if (
      gap > 0
    ) {

      gaps.push(
        gap
      );
    }
  }


  if (
    !gaps.length
  ) {

    return columns;
  }


  gaps.sort(
    (a, b) =>
      a - b
  );


  /*
    使用中位数作为正常列距，
    避免某一个异常距离影响判断。
  */

  const normalGap =
    median(
      gaps
    );


  if (
    !normalGap ||
    normalGap <= 0
  ) {

    return columns;
  }


  const firstGap =
    columns[1].x -
    columns[0].x;


  /*
    第一列只有一个结果，
    同时第一、第二列靠得异常近，

    才认为第一列是
    同一个圆被拆出来的假列。
  */

  if (
    columns[0].cells.length === 1 &&
    firstGap >
    0 &&
    firstGap <
    normalGap *
    0.62
  ) {

    return columns.slice(
      1
    );
  }


  return columns;
}


/* =====================================================
   转B/P顺序

   左 -> 右
   每列 上 -> 下
   ===================================================== */

function columnsToSequence(
  columns
) {

  const sequence =
    [];


  columns.forEach(column => {

    column.cells.forEach(() => {

      sequence.push(
        column.side
      );
    });
  });


  return sequence;
}


/* =====================================================
   截图识别核心
   ===================================================== */

function recognizeRoad(img) {

  const canvas =
    byId(
      'scanCanvas'
    );


  if (!canvas) {

    throw new Error(
      '找不到 scanCanvas'
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


  /*
    控制尺寸，
    防止电脑和手机处理超大截图时卡顿。
  */

  const maxWidth =
    1200;


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
    红蓝Mask
  */

  const masks =
    createSideMasks(
      imageData,
      w,
      h
    );


  /*
    2.
    红蓝分别寻找真实区域
  */

  const redComponents =
    findMaskComponents(
      masks.red,
      w,
      h,
      'B'
    );


  const blueComponents =
    findMaskComponents(
      masks.blue,
      w,
      h,
      'P'
    );


  let components =
    redComponents.concat(
      blueComponents
    );


  if (
    components.length <
    2
  ) {

    throw new Error(
      '没有找到足够的红圈或蓝圈'
    );
  }


  /*
    3.
    估计正常圆尺寸
  */

  const markerSize =
    estimateMarkerSize(
      components
    );


  /*
    4.
    过滤明显噪点和左边小残片
  */

  components =
    filterComponents(
      components,
      markerSize
    );


  if (
    components.length <
    2
  ) {

    throw new Error(
      '有效红蓝标记太少'
    );
  }


  /*
    5.
    根据真实圆建立真实竖列。

    不猜空列。
    不补格。
  */

  let columns =
    buildRealColumns(
      components,
      markerSize
    );


  if (
    !columns.length
  ) {

    throw new Error(
      '没有识别到有效珠盘路'
    );
  }


  /*
    6.
    检查最开始是否出现
    一个重复假列。

    这是V14唯一新增的
    主要识别修复。
  */

  columns =
    removeFalseFirstColumn(
      columns
    );


  if (
    !columns.length
  ) {

    throw new Error(
      '有效珠盘路列为空'
    );
  }


  /*
    7.
    转最终B/P顺序
  */

  const sequence =
    columnsToSequence(
      columns
    );


  if (
    !sequence.length
  ) {

    throw new Error(
      '没有识别到B/P'
    );
  }


  /*
    异常保护。

    防止突然识别成
    100多手直接灌入历史。
  */

  if (
    sequence.length >
    100
  ) {

    throw new Error(
      `识别结果异常：${sequence.length}手，已停止导入`
    );
  }


  return {

    sequence,

    bpCount:
      sequence.length,

    columns:
      columns.length,

    markerSize,

    width:
      w,

    height:
      h
  };
}


/* =====================================================
   导入截图结果
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

    每次截图继续追加。

    不覆盖。
    不去重。
  */

  bpSequence.forEach(result => {

    gameHistory.push(
      result
    );


    advanceAfterInput(
      result
    );
  });


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
          '正在识别红圈B / 蓝圈P……';
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


          const imported =
            importRecognizedSequence(
              result.sequence
            );


          if (status) {

            status.textContent =
              `✅ 识别完成 ｜ ` +
              `本次追加 ${imported.bpCount}手 ｜ ` +
              `识别 ${result.columns}列 ｜ ` +
              `总历史 ${imported.afterCount}手`;
          }

        } catch (err) {

          console.error(
            err
          );


          if (status) {

            status.textContent =
              `❌ ${err.message || String(err)}`;
          }

        } finally {

          /*
            无论识别成功还是失败，
            按钮一定恢复。
  */

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
`使用规则：

【截图识别】

只截珠盘路区域。

程序只识别：

红圈 = B
蓝圈 = P

绿色全部忽略。

不识别和。
不统计和。


每一个结果必须
在图片中真实检测到红色或蓝色。

不会自动补空格。

不会自动补弱格。

不会因为上下有结果
就自动增加一手。


同一竖排颜色
只用于判断：

这一列是B还是P。

不会用于增加手数。


读取顺序：

从左到右。

每一竖排：

从上到下。


【开头重复保护】

如果第一列只有一手，

而第一列与第二列
距离明显小于后面的正常列距，

程序会判断第一列
可能是同一个圆产生的重复假列，

自动删除这个假列。

这个功能专门解决：

实际49手，
却识别成50手，

开头多一个P或B的问题。


【追加】

只要没有按Reset：

截图识别多少B/P
就继续追加多少B/P。

手动输入P/B
也继续追加。


【Back】

删除最后一个B/P，

根据剩余历史
重新计算。


【Reset】

Reset是唯一清零方式。


【统计】

从第91个B/P开始：

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


/* =====================================================
   关闭说明
   ===================================================== */

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

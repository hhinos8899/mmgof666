/* =====================================================
   AI 预测系统
   最终稳定版 app.js

   截图识别规则：

   红圈 = B
   蓝圈 = P

   绿色全部忽略
   不识别和
   不统计和

   重要：
   1. 绝对不自动补空格
   2. 绝对不根据整列凭空增加手数
   3. 只有真的检测到红/蓝主体才算一手
   4. 同一竖排颜色只辅助判断 B/P
   5. 手动输入 + 截图输入全部追加
   6. 只有 Reset 清零
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
  phase：

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


    item.textContent =
      type;


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


  /*
    每次新增后自动滚到最新位置
  */

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
   显示统计
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


/* =====================================================
   手数显示
   ===================================================== */

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
     phase 1：门槛
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
   颜色分类

   最终版：
   只识别红、蓝。

   绿色彻底忽略。
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
    hsv.s < 0.24 ||
    hsv.v < 0.25
  ) {
    return null;
  }


  /* 红 = B */

  if (
    hsv.h <= 28 ||
    hsv.h >= 332
  ) {
    return 'B';
  }


  /* 蓝 = P */

  if (
    hsv.h >= 178 &&
    hsv.h <= 258
  ) {
    return 'P';
  }


  /*
    绿色和其他颜色全部忽略
  */

  return null;
}


/* =====================================================
   找红蓝连通区域

   这一步只用来找到真实存在的圆。

   不会自动补任何格子。
   ===================================================== */

function findColorComponents(
  imageData,
  width,
  height
) {

  const data =
    imageData.data;


  const total =
    width *
    height;


  const mask =
    new Uint8Array(
      total
    );


  const visited =
    new Uint8Array(
      total
    );


  /*
    建红蓝Mask
  */

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
      type === 'B' ||
      type === 'P'
    ) {

      mask[i] = 1;
    }
  }


  const stack = [];

  const result = [];


  const absoluteMinArea =
    Math.max(
      4,
      Math.floor(
        total *
        0.0000025
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


      if (x < minX) {
        minX = x;
      }

      if (x > maxX) {
        maxX = x;
      }

      if (y < minY) {
        minY = y;
      }

      if (y > maxY) {
        maxY = y;
      }


      /*
        8方向连接。

        红蓝圆即使被绿线切一点，
        也更容易保持为同一个主体。
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


          const n =
            ny *
            width +
            nx;


          if (
            mask[n] &&
            !visited[n]
          ) {

            visited[n] = 1;

            stack.push(n);
          }
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
      bw < 2 ||
      bh < 2
    ) {
      continue;
    }


    result.push({

      x:
        sumX /
        area,

      y:
        sumY /
        area,

      width:
        bw,

      height:
        bh,

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
    [...arr]
      .sort(
        (x, y) =>
          x - y
      );


  const m =
    Math.floor(
      a.length /
      2
    );


  if (
    a.length %
    2
  ) {
    return a[m];
  }


  return (
    a[m - 1] +
    a[m]
  )
  /
  2;
}


/* =====================================================
   估计圆大小
   ===================================================== */

function estimateNormalDiameter(
  components
) {

  if (
    !components.length
  ) {
    return 12;
  }


  const sizes =
    components
      .map(
        p =>
          Math.max(
            p.width,
            p.height
          )
      )
      .filter(
        size =>
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


  /*
    去掉最小的一些碎片
  */

  const start =
    Math.floor(
      sizes.length *
      0.20
    );


  const usable =
    sizes.slice(start);


  return (
    median(usable)
    ||
    median(sizes)
    ||
    12
  );
}


/* =====================================================
   过滤真实圆主体
   ===================================================== */

function getGridAnchors(
  components,
  normalDiameter
) {

  const minSize =
    normalDiameter *
    0.38;


  const maxSize =
    normalDiameter *
    1.9;


  const minArea =
    Math.max(
      3,
      normalDiameter *
      normalDiameter *
      0.035
    );


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
        big <
        minSize ||
        big >
        maxSize
      ) {
        return false;
      }


      /*
        太细长的红蓝线不是圆
  */

      if (
        small /
        big <
        0.22
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

  if (
    !values.length
  ) {
    return [];
  }


  const sorted =
    [...values]
      .sort(
        (a, b) =>
          a - b
      );


  const groups = [];


  sorted.forEach(
    value => {

      let best =
        null;


      let bestDist =
        Infinity;


      groups.forEach(
        group => {

          const d =
            Math.abs(
              value -
              group.center
            );


          if (
            d <= tolerance &&
            d < bestDist
          ) {

            best =
              group;


            bestDist =
              d;
          }
        }
      );


      if (!best) {

        groups.push({

          center:
            value,

          values:
            [value]
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
        )
        /
        best.values.length;
    }
  );


  groups.sort(
    (a, b) =>
      a.center -
      b.center
  );


  return groups;
}


/* =====================================================
   估计网格间距
   ===================================================== */

function estimateGridSpacing(
  centers,
  normalDiameter
) {

  if (
    centers.length <
    2
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


  if (
    !diffs.length
  ) {

    return (
      normalDiameter *
      1.25
    );
  }


  diffs.sort(
    (a, b) =>
      a - b
  );


  /*
    较小的间距更接近真实格距，
    大间距可能是中间空列。
  */

  const usable =
    diffs.slice(
      0,
      Math.max(
        1,
        Math.ceil(
          diffs.length *
          0.60
        )
      )
    );


  return (
    median(usable)
    ||
    normalDiameter *
    1.25
  );
}


/* =====================================================
   建立6行网格

   注意：
   这里只确定位置。

   不代表每个格子都有结果。
   ===================================================== */

function buildGrid(
  anchors,
  normalDiameter
) {

  if (
    anchors.length <
    2
  ) {

    throw new Error(
      '识别到的红蓝圆太少'
    );
  }


  const tolerance =
    normalDiameter *
    0.58;


  let rowGroups =
    clusterValues(
      anchors.map(
        p => p.y
      ),
      tolerance
    );


  let colGroups =
    clusterValues(
      anchors.map(
        p => p.x
      ),
      tolerance
    );


  /*
    只保留6个主要行
  */

  if (
    rowGroups.length >
    6
  ) {

    rowGroups =
      [...rowGroups]
        .sort(
          (a, b) =>
            b.values.length -
            a.values.length
        )
        .slice(
          0,
          6
        )
        .sort(
          (a, b) =>
            a.center -
            b.center
        );
  }


  let rowCenters =
    rowGroups.map(
      g => g.center
    );


  let colCenters =
    colGroups.map(
      g => g.center
    );


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


  /*
    如果少了一行，
    可以补“行的位置”。

    这里只补网格坐标，
    后面仍然必须真实检测到红/蓝，
    才会增加一手。
  */

  if (
    rowCenters.length >= 2 &&
    rowCenters.length < 6
  ) {

    const first =
      rowCenters[0];


    const generated =
      [];


    for (
      let i = 0;
      i < 6;
      i++
    ) {

      const expected =
        first +
        i *
        rowSpacing;


      let nearest =
        null;


      let nearestDist =
        Infinity;


      rowCenters.forEach(
        y => {

          const d =
            Math.abs(
              y -
              expected
            );


          if (
            d <
            nearestDist
          ) {

            nearest =
              y;

            nearestDist =
              d;
          }
        }
      );


      if (
        nearest !== null &&
        nearestDist <
        rowSpacing *
        0.40
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
      .slice(
        0,
        6
      );


  colCenters =
    colCenters
      .sort(
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
   单个格子真实识别

   重点：

   不自动补。
   真的看到颜色才算。
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


  let redCount = 0;

  let blueCount = 0;

  let sampled = 0;


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
        x -
        cx;


      const dy =
        y -
        cy;


      if (
        dx * dx +
        dy * dy >
        radiusSq
      ) {
        continue;
      }


      sampled++;


      const pos =
        (
          y *
          width +
          x
        )
        *
        4;


      const type =
        classifyColor(
          data[pos],
          data[pos + 1],
          data[pos + 2],
          data[pos + 3]
        );


      if (
        type === 'B'
      ) {

        redCount++;

      } else if (
        type === 'P'
      ) {

        blueCount++;
      }
    }
  }


  if (
    !sampled
  ) {
    return null;
  }


  const bestCount =
    Math.max(
      redCount,
      blueCount
    );


  const secondCount =
    Math.min(
      redCount,
      blueCount
    );


  /*
    必须真的存在一定量红/蓝像素。

    不能因为“这一列应该有”
    就自动增加。
  */

  const minPixels =
    Math.max(
      3,
      Math.floor(
        sampled *
        0.012
      )
    );


  if (
    bestCount <
    minPixels
  ) {

    return null;
  }


  /*
    主颜色必须明显高于另一种颜色。

    这样可以防止跨到旁边圆。
  */

  if (
    secondCount > 0 &&
    bestCount <
    secondCount *
    1.20
  ) {

    return null;
  }


  return (
    redCount >
    blueCount
      ?
      'B'
      :
      'P'
  );
}


/* =====================================================
   读取网格

   关键修复：

   每一格单独判断。

   不连续补格。
   不自动补弱格。
   不根据lastRow填满。
   ===================================================== */

function gridToSequence(
  imageData,
  width,
  height,
  grid,
  normalDiameter
) {

  const sequence =
    [];


  /*
    采样半径不要太大，
    否则可能扫到上下左右其他圆。
  */

  const sampleRadius =
    Math.max(

      normalDiameter *
      0.58,

      Math.min(
        grid.rowSpacing,
        grid.colSpacing
      )
      *
      0.34
    );


  for (
    let c = 0;
    c < grid.columns.length;
    c++
  ) {

    const cx =
      grid.columns[c];


    /*
      先看整列红蓝倾向。

      这里只辅助判断颜色，
      绝不增加格子。
    */

    let columnRed = 0;

    let columnBlue = 0;


    const cellResults =
      [];


    for (
      let r = 0;
      r < grid.rows.length;
      r++
    ) {

      const cy =
        grid.rows[r];


      const result =
        classifyGridCell(
          imageData,
          width,
          height,
          cx,
          cy,
          sampleRadius
        );


      cellResults.push(
        result
      );


      if (
        result === 'B'
      ) {

        columnRed++;

      } else if (
        result === 'P'
      ) {

        columnBlue++;
      }
    }


    /*
      整列主颜色

      只有已经真实识别出的格子
      才参与统计。
  */

    let columnSide =
      null;


    if (
      columnRed >
      columnBlue
    ) {

      columnSide = 'B';

    } else if (
      columnBlue >
      columnRed
    ) {

      columnSide = 'P';
    }


    /*
      正式输出：

      只有非空格才加入。

      同列规则只用于纠正
      某个真实识别格子的B/P颜色。

      null永远不会自动变成B或P。
  */

    for (
      let r = 0;
      r < cellResults.length;
      r++
    ) {

      const result =
        cellResults[r];


      if (!result) {
        continue;
      }


      if (
        columnSide
      ) {

        sequence.push(
          columnSide
        );

      } else {

        sequence.push(
          result
        );
      }
    }
  }


  return sequence;
}


/* =====================================================
   截图识别
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
        willReadFrequently:
          true
      }
    );


  /*
    尽量保留原图清晰度。
  */

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
    找真实红蓝区域
  */

  const components =
    findColorComponents(
      imageData,
      w,
      h
    );


  if (
    components.length <
    2
  ) {

    throw new Error(
      '没有找到足够的红蓝圆'
    );
  }


  /*
    2.
    估计圆大小
  */

  const normalDiameter =
    estimateNormalDiameter(
      components
    );


  /*
    3.
    过滤圆主体
  */

  const anchors =
    getGridAnchors(
      components,
      normalDiameter
    );


  if (
    anchors.length <
    2
  ) {

    throw new Error(
      '无法定位路单网格'
    );
  }


  /*
    4.
    建网格位置
  */

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


  /*
    5.
    每个格子真实识别

    没检测到红/蓝就不算。
  */

  const sequence =
    gridToSequence(
      imageData,
      w,
      h,
      grid,
      normalDiameter
    );


  if (
    !sequence.length
  ) {

    throw new Error(
      '没有识别到B/P'
    );
  }


  return {

    sequence,

    bpCount:
      sequence.length,

    width:
      w,

    height:
      h,

    normalDiameter,

    rows:
      grid.rows.length,

    columns:
      grid.columns.length
  };
}


/* =====================================================
   导入识别结果

   只存在 B / P。
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
    最终规则：

    没有按Reset，
    本次识别多少，
    就追加多少。

    不覆盖。
    不去重。
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
          '正在识别红色B / 蓝色P……';
      }


      setButtonsDisabled(true);


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
              `✅ 珠盘路识别完成 ｜ ` +
              `本次追加 ${imported.bpCount}手 ｜ ` +
              `总历史 ${imported.afterCount}手`;
          }

        } catch (err) {

          console.error(err);


          if (status) {

            status.textContent =
              `❌ ${err.message || String(err)}`;
          }

        } finally {

          setButtonsDisabled(false);


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


        setButtonsDisabled(false);


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
    byId('instModal');


  const text =
    byId('instText');


  if (text) {

    text.textContent =
`最终版使用规则：

【截图识别】

只截路单区域。

程序只识别：

红圈 = B
蓝圈 = P

绿色全部忽略。

不识别和。
不统计和。
不会因为绿色增加手数。


每一手都必须真的检测到
红色或蓝色主体才会加入。

不会再自动补空格。
不会因为一列有6格位置
就强行加入6手。


同一竖排的颜色规则
只用于辅助判断B还是P，

绝对不会用来凭空增加手数。


【追加规则】

没有按Reset：

截图识别多少B/P
就追加多少B/P。

手动输入P/B
也一样继续追加。


例如：

截图65手
+
手动5手
+
下一张截图20手

总历史 = 90手。


【第91手统计】

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

然后按剩余全部历史
重新计算。


【Reset】

唯一清零方式。

Reset以后清空：

历史
套入状态
门槛
预测
命中统计
连对
连错
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

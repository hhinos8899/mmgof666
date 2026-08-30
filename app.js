/* =====================================================
   AI 预测系统
   珠盘路截图识别版

   截图规则：
   红圆 = B
   蓝圆 = P

   圆上绿色杠：
   1条 = 后面1个T
   2条 = 后面2个T
   3条 = 后面3个T

   T会识别和统计，
   但不进入B/P预测历史。

   没按Reset：
   手动输入和每次截图都继续追加。

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
  phase:

  0 = 套入
  1 = 门槛
  2 = 正式预测
*/

let phase = 0;


/* =====================================================
   phase 0
   ===================================================== */

let matchIdx = 0;

let completedAtRealHand = 0;

let phase0Cursor = 0;


/* =====================================================
   phase 1
   ===================================================== */

let gateStep = 0;

let gateHits = 0;

let lastGateLine = "";


/* =====================================================
   phase 2
   ===================================================== */

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


  buttons.forEach(
    btn => {

      btn.disabled =
        disabled;
    }
  );
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


/* =====================================================
   文字显示
   ===================================================== */

function showTextOnly(msg) {

  setLabelAI();


  const text =
    byId('predictionText');


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
    byId('recordDisplay');


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
    byId('historyCount');


  if (count) {

    count.textContent =
      `${gameHistory.length}手`;
  }


  /*
    每次新增结果后
    自动显示最新一手
  */

  requestAnimationFrame(
    () => {

      recordDisplay.scrollTop =
        recordDisplay.scrollHeight;
    }
  );
}


/* =====================================================
   预测统计清零
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
   统计一手预测
   ===================================================== */

function settlePrediction(
  actual,
  predicted,
  realHand
) {

  /*
    第91个B/P才开始统计
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
   更新统计显示
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


/* =====================================================
   手数显示
   ===================================================== */

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
   核心预测推进
   ===================================================== */

function advanceAfterInput(
  actual
) {

  /* ===================================================
     phase 0
     套入
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
            `✅ 已套完24手｜开始门槛PBP`;


          loopGroupIdx = 0;


          loopPos = 0;


          phase2StartRealHand = 0;
        }
      }
    }


    return;
  }


  /* ===================================================
     phase 1
     PBP门槛
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
     phase 2
     正式预测
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
   更新当前显示
   ===================================================== */

function updateView() {

  const upcomingReal =
    gameHistory.length + 1;


  /* phase 0 */

  if (phase === 0) {

    const need =
      GROUPS[matchIdx];


    showTextOnly(
      `套入24手中｜当前需要 ${need}｜顺序命中，中间允许插`
    );


    return;
  }


  /* phase 1 */

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


  /* phase 2 */

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
   根据历史重新计算
   Back使用
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


  setButtonsDisabled(true);


  /*
    手动输入也追加
  */

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
   唯一清零
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
   颜色分类

   红 = B
   蓝 = P
   绿 = T标记
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
    hsv.s < 0.28 ||
    hsv.v < 0.25
  ) {

    return null;
  }


  /* 红 */

  if (
    hsv.h <= 25 ||
    hsv.h >= 335
  ) {

    return 'B';
  }


  /* 蓝 */

  if (
    hsv.h >= 180 &&
    hsv.h <= 255
  ) {

    return 'P';
  }


  /* 绿 */

  if (
    hsv.h >= 65 &&
    hsv.h <= 175
  ) {

    return 'T';
  }


  return null;
}


/* =====================================================
   找红/蓝主体连通块

   注意：

   这里只用红和蓝建立珠盘路网格。

   绿色杠绝对不参与网格定位。
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
    建立红/蓝主体mask
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
      8,
      Math.floor(
        total *
        0.000004
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


      let n;


      /* 左 */

      if (x > 0) {

        n =
          cur - 1;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;


          stack.push(n);
        }
      }


      /* 右 */

      if (
        x <
        width - 1
      ) {

        n =
          cur + 1;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;


          stack.push(n);
        }
      }


      /* 上 */

      if (y > 0) {

        n =
          cur -
          width;


        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;


          stack.push(n);
        }
      }


      /* 下 */

      if (
        y <
        height - 1
      ) {

        n =
          cur +
          width;


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
   估计珠盘圆大小
   ===================================================== */

function estimateNormalDiameter(
  components
) {

  if (
    !components.length
  ) {

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


  /*
    排除很小的噪点
  */

  const start =
    Math.floor(
      sizes.length *
      0.25
    );


  let usable =
    sizes.slice(
      start
    );


  if (!usable.length) {

    usable =
      sizes;
  }


  return (
    median(usable)
    ||
    median(sizes)
    ||
    14
  );
}


/* =====================================================
   过滤珠盘圆主体
   ===================================================== */

function getGridAnchors(
  components,
  normalDiameter
) {

  const minSize =
    normalDiameter *
    0.48;


  const maxSize =
    normalDiameter *
    1.9;


  const minArea =
    normalDiameter *
    normalDiameter *
    0.08;


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
        minSize
      ) {

        return false;
      }


      if (
        big >
        maxSize
      ) {

        return false;
      }


      if (
        small /
        big <
        0.38
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
      0.40
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
          0.65
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
   建立珠盘路网格

   珠盘路固定6行
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
      '识别到的珠盘圆太少'
    );
  }


  const tolerance =
    normalDiameter *
    0.55;


  let rowGroups =
    clusterValues(
      anchors.map(
        p =>
          p.y
      ),
      tolerance
    );


  let colGroups =
    clusterValues(
      anchors.map(
        p =>
          p.x
      ),
      tolerance
    );


  /*
    如果行识别超过6行，
    只保留最主要的6行
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
      g =>
        g.center
    );


  let colCenters =
    colGroups.map(
      g =>
        g.center
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
    珠盘路固定6行。

    如果某一行刚好没有圆，
    根据间距补齐。
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
   珠盘路单格识别

   红主体 = B
   蓝主体 = P

   绿色杠：
   1条 = 1个T
   2条 = 2个T
   ===================================================== */

function classifyBeadCell(
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
      5,
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


  /*
    第一遍：

    判断这个格子主体
    是庄还是闲
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


      const pos =
        (
          y *
          width
          +
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
      }


      if (
        type === 'P'
      ) {

        blueCount++;
      }
    }
  }


  const mainCount =
    Math.max(
      redCount,
      blueCount
    );


  /*
    没有明显红蓝主体
    = 空格
  */

  if (
    mainCount <
    10
  ) {

    return null;
  }


  const side =
    redCount >= blueCount
      ? 'B'
      : 'P';


  /* ===================================================
     下面开始找绿色杠
     =================================================== */

  const cellW =
    maxX -
    minX +
    1;


  const cellH =
    maxY -
    minY +
    1;


  const greenMask =
    new Uint8Array(
      cellW *
      cellH
    );


  let greenPixelTotal =
    0;


  /*
    建立绿色像素mask
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

      const dx =
        x - cx;


      const dy =
        y - cy;


      /*
        绿色杠有可能稍微超过主体圆边缘，
        所以这里稍微放宽一点。
      */

      if (
        dx * dx +
        dy * dy >
        radiusSq *
        1.10
      ) {

        continue;
      }


      const pos =
        (
          y *
          width
          +
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
        type === 'T'
      ) {

        const lx =
          x -
          minX;


        const ly =
          y -
          minY;


        greenMask[
          ly *
          cellW
          +
          lx
        ] = 1;


        greenPixelTotal++;
      }
    }
  }


  /*
    没绿色
  */

  if (
    greenPixelTotal <
    3
  ) {

    return {

      side,

      ties:0
    };
  }


  /* ===================================================
     找绿色连通块
     一条明显绿色杠 ≈ 一个连通块
     =================================================== */

  const visited =
    new Uint8Array(
      greenMask.length
    );


  const stack = [];


  const bars = [];


  for (
    let start = 0;
    start < greenMask.length;
    start++
  ) {

    if (
      !greenMask[start] ||
      visited[start]
    ) {

      continue;
    }


    visited[start] = 1;


    stack.length = 0;


    stack.push(start);


    let area = 0;


    let minGX =
      cellW;


    let maxGX = 0;


    let minGY =
      cellH;


    let maxGY = 0;


    while (
      stack.length
    ) {

      const cur =
        stack.pop();


      const gy =
        Math.floor(
          cur /
          cellW
        );


      const gx =
        cur -
        gy *
        cellW;


      area++;


      if (
        gx <
        minGX
      ) {

        minGX =
          gx;
      }


      if (
        gx >
        maxGX
      ) {

        maxGX =
          gx;
      }


      if (
        gy <
        minGY
      ) {

        minGY =
          gy;
      }


      if (
        gy >
        maxGY
      ) {

        maxGY =
          gy;
      }


      /*
        8方向连接，
        对斜杠识别更稳定
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
            nx >= cellW ||
            ny < 0 ||
            ny >= cellH
          ) {

            continue;
          }


          const n =
            ny *
            cellW
            +
            nx;


          if (
            greenMask[n] &&
            !visited[n]
          ) {

            visited[n] = 1;


            stack.push(n);
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
      排除绿色噪点
    */

    if (
      area >= 3 &&
      longSide >=
      radius *
      0.28
    ) {

      bars.push({

        area,

        bw,

        bh,

        longSide
      });
    }
  }


  let tieBars =
    bars.length;


  /*
    有时两条紧挨着的绿杠，
    在截图里会粘成一个连通块。

    如果只有1个连通块，
    但绿色面积明显很大，
    尝试判断是不是2个连续和。
  */

  if (
    tieBars === 1
  ) {

    const bar =
      bars[0];


    const normalBarArea =
      Math.max(
        4,
        radius *
        0.55
      );


    if (
      bar.area >
      normalBarArea *
      2.35
    ) {

      tieBars = 2;
    }
  }


  /*
    防止截图噪点造成异常数量。
    连续和通常不会很多，
    但这里最多支持5个。
  */

  tieBars =
    Math.max(
      0,
      Math.min(
        tieBars,
        5
      )
    );


  return {

    side,

    ties:
      tieBars
  };
}


/* =====================================================
   珠盘路读取

   每列：
   上 -> 下

   然后进入右边下一列

   例：

   红 + 1绿杠
   =
   B T

   蓝 + 2绿杠
   =
   P T T
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
      0.62,

      Math.min(
        grid.rowSpacing,
        grid.colSpacing
      )
      *
      0.40
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


      const cell =
        classifyBeadCell(
          imageData,
          width,
          height,
          cx,
          cy,
          sampleRadius
        );


      if (!cell) {

        continue;
      }


      /*
        先记录本手庄/闲
      */

      sequence.push(
        cell.side
      );


      /*
        后面连续几个和，
        就补几个T
      */

      for (
        let i = 0;
        i < cell.ties;
        i++
      ) {

        sequence.push(
          'T'
        );
      }
    }
  }


  return sequence;
}


/* =====================================================
   识别珠盘路
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
    限制尺寸，
    避免手机太慢
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
    只寻找红蓝珠盘圆
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
      '没有找到足够的红蓝珠盘圆'
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
    过滤正常圆
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
      '无法定位珠盘路网格'
    );
  }


  /*
    4.
    建6行珠盘网格
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
      '无法建立珠盘路行列'
    );
  }


  /*
    5.
    逐格识别B/P和绿色杠
  */

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
   截图识别结果追加

   没按Reset：
   永远追加

   注意：
   T不进入gameHistory，
   只统计识别数量。
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
    本次识别多少B/P，
    就全部追加多少。
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

    fullSequence:
      sequence
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
          '正在识别珠盘路，请稍等……';
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
              `本次庄/闲 ${imported.bpCount}手 ｜ ` +
              `和 ${imported.tieCount}手 ｜ ` +
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
    byId('instModal');


  const text =
    byId('instText');


  if (text) {

    text.textContent =
`使用规则：

【手动输入】

点击 P / B：
直接追加到历史。

手动输入和截图输入
可以混合使用。


【截图识别】

现在使用珠盘路识别。

截图时只截完整珠盘路区域。

识别规则：

红圆 = B
蓝圆 = P

红圆或蓝圆上：

1条绿色杠
=
后面连续1个和

2条绿色杠
=
后面连续2个和

3条绿色杠
=
后面连续3个和


例如：

红圆
=
B

蓝圆
=
P

红圆 + 1条绿杠
=
B → T

蓝圆 + 1条绿杠
=
P → T

红圆 + 2条绿杠
=
B → T → T


T会被识别，
但T不会进入B/P预测历史。


【追加规则】

只要没有点击Reset：

每一次截图识别出的B/P
全部继续追加。

不会覆盖原来的历史。


例如：

第一次截图：
60手

手动输入：
5手

第二次截图：
20手

总历史：
85手


【统计】

从第91个B/P开始统计：

预测
命中
未中
命中率

当前连对
当前连错

最大连对
最大连错


【Back】

Back删除最后一个B/P，

然后根据剩余全部历史
重新计算预测和统计。


【Reset】

Reset是唯一清零方式。

点击Reset后：

历史清零
套入状态清零
门槛清零
预测清零
统计清零
连对连错清零


【珠盘读取顺序】

每列从上往下读取，

然后进入右边下一列。`;
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
      '就绪｜手动P/B或截图珠盘路追加'
    );


    updateView();


    setupImageRecognition();
  }
);

/**
 * 最终版本规则：
 *
 * 1) 套入24手阶段：
 *    不预测，只提示当前需要命中的组三连
 *
 * 2) 套完24手：
 *    进入门槛 PBP（虚拟25/26/27）
 *
 * 3) 门槛三手至少中1手：
 *    才进入正式逐手预测
 *
 * 4) 正式预测：
 *    BBP -> PPB -> PBP -> BBP -> PPB
 *    -> PBP -> PBB -> PBP ...
 *
 * 5) 第91个B/P开始统计正式预测：
 *    - 已预测
 *    - 命中
 *    - 未中
 *    - 当前连对
 *    - 当前连错
 *    - 命中率
 *    - 最高连对
 *    - 最高连错
 *
 * 6) T识别出来，但不进入B/P预测历史，
 *    也不进入第91手统计。
 *
 * 7) 截图识别：
 *    红 = B
 *    蓝 = P
 *    绿 = T
 *
 * 8) 截图追加规则：
 *    只要没有点击 Reset，
 *    每次截图识别出来的全部 B/P
 *    都直接追加到现有 gameHistory 后面。
 *
 *    不比较旧历史。
 *    不覆盖。
 *    不自动清零。
 *
 *    只有点击 Reset 才全部清零。
 */


// =====================================================
// 预测组
// =====================================================

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


// =====================================================
// 历史
// =====================================================

let gameHistory = [];

let waiting = false;


// =====================================================
// 阶段
//
// 0 = 套入
// 1 = 门槛
// 2 = 正式预测
// =====================================================

let phase = 0;


// =====================================================
// phase 0
// =====================================================

let matchIdx = 0;

let completedAtRealHand = 0;

let phase0Cursor = 0;


// =====================================================
// phase 1
// =====================================================

let gateStep = 0;

let gateHits = 0;

let lastGateLine = "";


// =====================================================
// phase 2
// =====================================================

let loopGroupIdx = 0;

let loopPos = 0;

let phase2StartRealHand = 0;


// =====================================================
// 第91手开始统计
// =====================================================

const STATS_START_HAND = 91;

let predictionTotal = 0;

let predictionHits = 0;

let currentWinStreak = 0;

let currentLoseStreak = 0;

let maxWinStreak = 0;

let maxLoseStreak = 0;


// =====================================================
// DOM
// =====================================================

function byId(id) {
  return document.getElementById(id);
}

function $(sel) {
  return document.querySelector(sel);
}


// =====================================================
// 按钮状态
// =====================================================

function setButtonsDisabled(
  disabled
) {

  const p =
    $('.player-btn');

  const b =
    $('.banker-btn');

  const back =
    $('.back-btn');

  const reset =
    $('.reset-btn');

  const scan =
    $('.scan-btn');


  if (p) {
    p.disabled = disabled;
  }

  if (b) {
    b.disabled = disabled;
  }

  if (back) {
    back.disabled = disabled;
  }

  if (reset) {
    reset.disabled = disabled;
  }

  if (scan) {
    scan.disabled = disabled;
  }
}


// =====================================================
// AI标签
// =====================================================

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


// =====================================================
// 显示文字
// =====================================================

function showTextOnly(msg) {

  setLabelAI();

  const pctEl =
    byId('resultPct');

  const text =
    byId('predictionText');

  if (pctEl) {
    pctEl.textContent = '';
  }

  if (text) {
    text.textContent = msg;
  }
}


// =====================================================
// 历史显示
// =====================================================

function renderHistory() {

  const recordDisplay =
    byId('recordDisplay');

  if (!recordDisplay) {
    return;
  }

  recordDisplay.innerHTML = '';

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
}


// =====================================================
// 第91手预测统计
// =====================================================

function resetPredictionStats() {

  predictionTotal = 0;

  predictionHits = 0;

  currentWinStreak = 0;

  currentLoseStreak = 0;

  maxWinStreak = 0;

  maxLoseStreak = 0;
}


// =====================================================
// 统计一次预测
// =====================================================

function settlePrediction(
  actual,
  predicted,
  realHand
) {

  /*
   * 第90手及以前
   * 不计统计
   */
  if (
    realHand <
    STATS_START_HAND
  ) {
    return;
  }

  /*
   * 只统计 B / P
   */
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


// =====================================================
// 命中率
// =====================================================

function getHitRate() {

  if (!predictionTotal) {
    return '--';
  }

  const rate =
    (
      predictionHits /
      predictionTotal
    ) * 100;

  return (
    rate.toFixed(1) +
    '%'
  );
}


// =====================================================
// 更新预测统计显示
// =====================================================

function renderPredictionStats() {

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

  const rateEl =
    byId('statRate');

  const maxWinEl =
    byId('statMaxWin');

  const maxLoseEl =
    byId('statMaxLose');


  const misses =
    predictionTotal -
    predictionHits;


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

  if (rateEl) {
    rateEl.textContent =
      getHitRate();
  }

  if (maxWinEl) {
    maxWinEl.textContent =
      maxWinStreak;
  }

  if (maxLoseEl) {
    maxLoseEl.textContent =
      maxLoseStreak;
  }
}


// =====================================================
// 虚拟手数
// =====================================================

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


// =====================================================
// 手数显示
// =====================================================

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


// =====================================================
// 下一手预测
// =====================================================

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


// =====================================================
// 核心推进
// =====================================================

function advanceAfterInput(
  actual
) {

  // ===================================================
  // phase 0：套入
  // ===================================================

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
            `✅ 第${completedAtRealHand}手(24手)已套完\n` +
            `开始门槛：下一手是(25手)`;

          loopGroupIdx = 0;

          loopPos = 0;

          phase2StartRealHand = 0;
        }
      }
    }

    return;
  }


  // ===================================================
  // phase 1：PBP门槛
  // ===================================================

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
      `门槛阶段：${fmtHand(realHand)}\n` +
      `本手结果=${actual}｜本手门槛预测=${pred}\n` +
      `进度：${gateStep + 1}/3｜累计命中：${gateHits}/3\n` +
      `（必须走满3手，三手里至少中1手才开始后面逐手预测）`;


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


  // ===================================================
  // phase 2：正式预测
  // ===================================================

  if (phase === 2) {

    /*
     * 这里必须先取本手预测，
     * 再推进到下一手。
     */

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


// =====================================================
// 页面显示
// =====================================================

function updateView() {

  const upcomingReal =
    gameHistory.length + 1;


  // ===================================================
  // phase 0
  // ===================================================

  if (phase === 0) {

    const need =
      GROUPS[matchIdx];

    showTextOnly(
      `套入24手中：当前需要命中 ${need}\n` +
      `（顺序命中即可，中间允许插，不预测）`
    );

    return;
  }


  // ===================================================
  // phase 1
  // ===================================================

  if (phase === 1) {

    const p =
      nextPredLetter();

    setLabelSide(p);


    const text =
      byId('predictionText');


    if (text) {

      text.textContent =
        `✅ 第${completedAtRealHand}手(24手)已套完\n` +
        (
          lastGateLine ||
          (
            `门槛：${fmtHand(upcomingReal)}` +
            `（25/26/27必须走满3手再判定）`
          )
        );
    }

    return;
  }


  // ===================================================
  // phase 2
  // ===================================================

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
      `✅ 已过门槛（PBP三手至少中1手）\n` +
      `依次预测：${fmtHand(upcomingReal)}\n` +
      `当前组：${g}（第${loopPos + 1}/3）｜本手预测：${p}`;
  }
}


// =====================================================
// 从历史重新计算
//
// Back 使用。
// Reset 后也会重新初始化。
// =====================================================

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


// =====================================================
// 手动输入
// =====================================================

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


// =====================================================
// Back
// =====================================================

window.undoLastMove =
function() {

  if (waiting) {
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


// =====================================================
// Reset
//
// 唯一真正清零的地方
// =====================================================

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


  showTextOnly(
    '已清零：历史、预测状态、连对连错、命中率全部重新开始。'
  );


  updateView();
};// =====================================================
// 截图识别入口
// =====================================================

window.openScreenshot = function() {
  const input = byId('imageInput');

  if (!input) {
    return;
  }

  input.value = '';
  input.click();
};


// =====================================================
// RGB -> HSV
// =====================================================

function rgbToHSV(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;

  if (d !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / d) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / d + 2);
    } else {
      h = 60 * ((r - g) / d + 4);
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
    v: max
  };
}


// =====================================================
// 像素颜色分类
//
// 红 = B
// 蓝 = P
// 绿 = T
// =====================================================

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
    rgbToHSV(r, g, b);

  if (
    hsv.s < 0.30 ||
    hsv.v < 0.28
  ) {
    return null;
  }

  // 红色：庄 B
  if (
    hsv.h <= 22 ||
    hsv.h >= 338
  ) {
    return 'B';
  }

  // 蓝色：闲 P
  if (
    hsv.h >= 185 &&
    hsv.h <= 250
  ) {
    return 'P';
  }

  // 绿色：和 T
  if (
    hsv.h >= 70 &&
    hsv.h <= 170
  ) {
    return 'T';
  }

  return null;
}


// =====================================================
// 找颜色连通块
//
// 这里只用于找正常的大圆位置，
// 不直接把每个色块当成一手。
// =====================================================

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


  // 建立颜色像素掩码
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
        total * 0.000006
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


      // 左
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


      // 右
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


      // 上
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


      // 下
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

      width:
        bw,

      height:
        bh,

      area
    });
  }


  return result;
}


// =====================================================
// 中位数
// =====================================================

function median(arr) {
  if (!arr.length) {
    return 0;
  }

  const a =
    [...arr].sort(
      (x, y) => x - y
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


// =====================================================
// 估计正常圆直径
//
// 小红点、小蓝点一般会明显更小。
// =====================================================

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
        v => v >= 4
      )
      .sort(
        (a, b) =>
          a - b
      );


  if (!sizes.length) {
    return 14;
  }


  // 忽略较小的40%碎片
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


// =====================================================
// 过滤出正常大圆候选
//
// 小红点、小蓝点不参与建立网格。
// =====================================================

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


// =====================================================
// 一维聚类
//
// 用来聚类：
// 行 Y
// 列 X
// =====================================================

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


  sorted.forEach(
    value => {
      let best = null;
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
            best = group;
            bestDist = d;
          }
        }
      );


      if (!best) {
        groups.push({
          center: value,
          values: [value]
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
    }
  );


  groups.sort(
    (a, b) =>
      a.center -
      b.center
  );


  return groups;
}


// =====================================================
// 估计网格间距
// =====================================================

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


  // 取较小的一部分，
  // 减少跨空列距离的干扰
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


// =====================================================
// 建立6行网格
// =====================================================

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


  // 最多6行
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


  // 如果截图中部分行没有结果，
  // 用现有行推算完整6行。
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
            nearest = y;
            nearestDist = d;
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


// =====================================================
// 判断单个网格是什么颜色
//
// 每格最多一个结果。
// 小对子点不会单独生成一手。
// =====================================================

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
    B: 0,
    P: 0,
    T: 0
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


  // 空格或者只有非常少的小标记
  if (
    bestCount < 7 ||
    coverage < 0.025
  ) {
    return null;
  }


  /*
   * 如果两个颜色数量比较接近，
   * 再检查格子正中心。
   */
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
      B: 0,
      P: 0,
      T: 0
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


// =====================================================
// 按网格读取顺序
//
// 每列：上 -> 下
// 然后进入右边下一列。
// =====================================================

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


// =====================================================
// 识别完整截图
// =====================================================

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


  // 手机性能控制
  const maxWidth = 1000;


  let w =
    img.naturalWidth ||
    img.width;


  let h =
    img.naturalHeight ||
    img.height;


  if (
    w > maxWidth
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


  // 1. 找所有颜色连通区域
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


  // 2. 估计正常大圆大小
  const normalDiameter =
    estimateNormalDiameter(
      components
    );


  // 3. 只拿大圆建立网格
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


  // 4. 建立6行网格
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


  // 5. 每格判断一次
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

    width: w,

    height: h,

    normalDiameter,

    rows:
      grid.rows.length,

    columns:
      grid.columns.length
  };
}


// =====================================================
// 截图识别结果导入
//
// ★ 最终固定规则：
//
// 只要没有按 Reset，
// 每一次截图识别出的全部 B/P
// 都直接追加到现有历史后面。
//
// 不比较。
// 不覆盖。
// 不去重。
// 不自动清零。
// =====================================================

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


  /*
   * T会识别出来，
   * 但不进入B/P历史。
   */
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
   * ★ 关键逻辑：
   *
   * 截图识别多少手，
   * 就追加多少手。
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

    afterCount
  };
}


// =====================================================
// 图片选择事件
// =====================================================

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
          '正在建立6行网格并识别，请稍等……';
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


          const originalText =
            result.sequence.join(
              ''
            );


          if (status) {
            status.textContent =
              `✅ 网格识别完成\n` +
              `本次识别顺序：${originalText}\n` +
              `本次追加庄/闲：${imported.bpCount}手\n` +
              `识别到和：${imported.tieCount}手（T不进入预测）\n` +
              `追加前历史：${imported.beforeCount}手\n` +
              `追加后历史：${imported.afterCount}手\n` +
              `✅ 未按 Reset，原历史全部保留。`;
          }

        } catch (err) {

          console.error(err);


          if (status) {
            status.textContent =
              `❌ 识别失败：${err.message || String(err)}\n` +
              `请使用矩形截图，尽量完整框住6行路单区域。`;
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
            '❌ 图片读取失败，请重新选择截图。';
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
}// =====================================================
// 使用说明
// =====================================================

window.toggleInstructions =
function() {

  const modal =
    byId('instModal');

  const text =
    byId('instText');


  if (text) {

    text.textContent =
`使用方法：

一、手动输入
点击 P 或 B 输入开奖结果。

手动输入和截图识别完全一样，
都会追加到同一个历史记录中。

例如：

第一次截图 70手
+
手动输入 5手
+
第二次截图 20手
=
总历史 95手


二、截图识别

1. 截取需要导入的路单区域。

2. 点击“📷 截图识别”。

3. 选择截图。

4. 系统建立6行网格。

5. 逐格识别：

   红色 = B
   蓝色 = P
   绿色 = T

6. 每个格子最多产生一个结果。

7. 小红点、小蓝点不会单独算一手。

8. T会被识别，但不会进入B/P预测历史。


三、截图追加规则

只要没有点击 Reset：

每一次截图识别到的所有 B/P，
都会直接追加到原来的历史后面。

例如：

原历史 = 70手

下一张截图识别 = 20手

新的总历史 = 90手


再截图识别 = 15手

新的总历史 = 105手


程序不会自动覆盖，
不会自动清零，
不会比较以前的截图。

只有点击 Reset 才会全部清零。


四、手动输入

手动点击的 P / B
也会直接追加到历史后面。

例如：

截图70手
+
手动5手
+
截图20手

总共就是95手。


五、第91手开始统计

从第91个 B/P 开始，
正式预测会统计：

已预测
命中
未中
当前连对
当前连错
命中率
最高连对
最高连错


预测正确：

当前连对 +1
当前连错归0


预测错误：

当前连错 +1
当前连对归0


六、Back

Back 会删除最后一个 B/P，
然后根据剩余全部历史重新计算：

24手套入
门槛
正式预测
第91手统计
连对
连错
命中率


七、Reset

Reset 是唯一清零方式。

点击 Reset 后会清空：

全部历史
24手套入状态
门槛状态
正式预测状态
命中统计
当前连对
当前连错
最高连对
最高连错
命中率


读取顺序：

每列从上往下，
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


// =====================================================
// 关闭使用说明
// =====================================================

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


// =====================================================
// 初始化
// =====================================================

document.addEventListener(
  'DOMContentLoaded',

  function() {

    renderHistory();

    renderPredictionStats();


    showTextOnly(
      '就绪：可手动输入B/P，也可以点击“📷 截图识别”追加路单。'
    );


    updateView();


    setupImageRecognition();

  }
);

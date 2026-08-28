/**
 * 最终要求：
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
 * 5) 截图识别：
 *    红 = B
 *    蓝 = P
 *    绿 = T
 *
 * 6) T识别出来，但不进入B/P预测历史
 *
 * 7) 本版本截图识别改为：
 *    先定位6行网格 -> 再逐格判断颜色
 *    每格最多一个结果
 *    避免小红点/小蓝点被当成独立一手
 */


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
  GROUPS.slice(1)
        .concat(GROUPS.slice(0, 1));


let gameHistory = [];
let waiting = false;


// phase:
// 0 = 套入
// 1 = 门槛
// 2 = 正式预测
let phase = 0;


// =========================
// phase 0
// =========================

let matchIdx = 0;
let completedAtRealHand = 0;
let phase0Cursor = 0;


// =========================
// phase 1
// =========================

let gateStep = 0;
let gateHits = 0;
let lastGateLine = "";


// =========================
// phase 2
// =========================

let loopGroupIdx = 0;
let loopPos = 0;
let phase2StartRealHand = 0;


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

function setButtonsDisabled(disabled) {

  const p = $('.player-btn');
  const b = $('.banker-btn');
  const back = $('.back-btn');
  const reset = $('.reset-btn');
  const scan = $('.scan-btn');

  if (p) p.disabled = disabled;
  if (b) b.disabled = disabled;
  if (back) back.disabled = disabled;
  if (reset) reset.disabled = disabled;
  if (scan) scan.disabled = disabled;
}


// =====================================================
// AI标签
// =====================================================

function setLabelAI() {

  const label = byId('resultLabel');

  if (!label) return;

  label.textContent = 'AI';

  label.classList.remove(
    'player',
    'banker'
  );
}


function setLabelSide(side) {

  const label = byId('resultLabel');

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


// =====================================================
// 显示文字
// =====================================================

function showTextOnly(msg) {

  setLabelAI();

  const pctEl = byId('resultPct');
  const text = byId('predictionText');

  if (pctEl) {
    pctEl.textContent = '';
  }

  if (text) {
    text.textContent = msg;
  }
}


// =====================================================
// 历史记录
// =====================================================

function renderHistory() {

  const recordDisplay =
    byId('recordDisplay');

  if (!recordDisplay) return;

  recordDisplay.innerHTML = '';

  gameHistory.forEach(type => {

    const item =
      document.createElement('div');

    item.className =
      `record-item ${type.toLowerCase()}`;

    item.textContent = type;

    recordDisplay.appendChild(item);
  });
}


// =====================================================
// 虚拟手数
// =====================================================

function virtualHandFor(realHand) {

  if (!completedAtRealHand) {
    return null;
  }

  if (phase === 1) {
    return 25 + gateStep;
  }

  if (phase === 2) {

    if (!phase2StartRealHand) {
      return null;
    }

    return 28 +
      (
        realHand -
        phase2StartRealHand
      );
  }

  return null;
}


function fmtHand(realHand) {

  const v =
    virtualHandFor(realHand);

  if (v === null) {
    return `第${realHand}手`;
  }

  return `第${realHand}手(${v}手)`;
}


// =====================================================
// 下一手预测
// =====================================================

function nextPredLetter() {

  if (phase === 1) {
    return "PBP"[gateStep];
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

function advanceAfterInput(actual) {

  // =====================
  // phase 0：套入
  // =====================

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


  // =====================
  // phase 1：PBP门槛
  // =====================

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

    if (gateStep < 3) {
      return;
    }

    if (gateHits >= 1) {

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


  // =====================
  // phase 2：正式预测
  // =====================

  if (phase === 2) {

    loopPos++;

    if (loopPos >= 3) {

      loopPos = 0;

      loopGroupIdx =
        (
          loopGroupIdx + 1
        ) %
        LOOP_GROUPS.length;
    }
  }
}


// =====================================================
// 页面显示
// =====================================================

function updateView() {

  const upcomingReal =
    gameHistory.length + 1;


  // phase 0

  if (phase === 0) {

    const need =
      GROUPS[matchIdx];

    showTextOnly(
      `套入24手中：当前需要命中 ${need}\n` +
      `（顺序命中即可，中间允许插，不预测）`
    );

    return;
  }


  // phase 1

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
          `门槛：${fmtHand(upcomingReal)}` +
          `（25/26/27必须走满3手再判定）`
        );
    }

    return;
  }


  // phase 2

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
// 重算
// =====================================================

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

  gameHistory = [];

  arr.forEach(x => {

    gameHistory.push(x);

    advanceAfterInput(x);
  });
}


// =====================================================
// 手动输入
// =====================================================

window.recordResult =
function(type) {

  if (waiting) return;

  if (
    type !== 'B' &&
    type !== 'P'
  ) {
    return;
  }

  waiting = true;

  setButtonsDisabled(true);

  gameHistory.push(type);

  renderHistory();

  advanceAfterInput(type);

  updateView();

  waiting = false;

  setButtonsDisabled(false);
};


// =====================================================
// Back
// =====================================================

window.undoLastMove =
function() {

  if (waiting) return;

  const old =
    [...gameHistory];

  old.pop();

  recomputeFromHistory(old);

  renderHistory();

  updateView();
};


// =====================================================
// Reset
// =====================================================

window.resetGame =
function() {

  if (waiting) return;

  recomputeFromHistory([]);

  renderHistory();

  showTextOnly(
    '已重置：先套入24手（顺序命中，允许插）→ 门槛PBP三手 → 过门槛才逐手预测。'
  );

  updateView();
};


// =====================================================
// 截图识别
// =====================================================

window.openScreenshot =
function() {

  const input =
    byId('imageInput');

  if (!input) return;

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
    v: max
  };
}


// =====================================================
// 像素颜色分类
// =====================================================

function classifyColor(r, g, b, a = 255) {

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
// 这里不是直接生成最终结果，
// 只是用来找网格圆心。
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


      if (x < width - 1) {

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

        n = cur - width;

        if (
          mask[n] &&
          !visited[n]
        ) {

          visited[n] = 1;
          stack.push(n);
        }
      }


      if (y < height - 1) {

        n = cur + width;

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
      maxX - minX + 1;

    const bh =
      maxY - minY + 1;


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

      area:
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
// 估计正常圆大小
//
// 小红点、小蓝点会明显小很多。
// 这里使用较大的那部分色块估计正常格子圆。
// =====================================================

function estimateNormalDiameter(
  components
) {

  if (!components.length) {
    return 14;
  }


  let sizes =
    components
      .map(p =>
        Math.max(
          p.width,
          p.height
        )
      )
      .filter(v =>
        v >= 4
      )
      .sort(
        (a, b) => a - b
      );


  if (!sizes.length) {
    return 14;
  }


  // 忽略最小40%的碎片
  const start =
    Math.floor(
      sizes.length * 0.40
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
// 过滤掉明显的小点和文字
// 只留下可以用于建立网格的“大圆候选”
// =====================================================

function getGridAnchors(
  components,
  normalDiameter
) {

  const minSize =
    normalDiameter * 0.55;

  const maxSize =
    normalDiameter * 1.85;


  const minArea =
    normalDiameter *
    normalDiameter *
    0.10;


  return components.filter(p => {

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
  });
}


// =====================================================
// 一维聚类
//
// 用于把圆心分成：
// X列
// Y行
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
      (a, b) => a - b
    );


  const groups = [];


  sorted.forEach(value => {

    let best = null;

    let bestDist = Infinity;


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

        center:
          value,

        values:
          [value]
      });

      return;
    }


    best.values.push(value);


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
      a.center - b.center
  );


  return groups;
}


// =====================================================
// 估计行距/列距
// =====================================================

function estimateGridSpacing(
  centers,
  normalDiameter
) {

  if (
    centers.length < 2
  ) {
    return (
      normalDiameter * 1.25
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
      normalDiameter * 0.45
    ) {

      diffs.push(d);
    }
  }


  if (!diffs.length) {

    return (
      normalDiameter * 1.25
    );
  }


  diffs.sort(
    (a, b) => a - b
  );


  // 取较小的一半，
  // 防止跨空列产生的大距离影响
  const usable =
    diffs.slice(
      0,
      Math.max(
        1,
        Math.ceil(
          diffs.length * 0.6
        )
      )
    );


  return (
    median(usable) ||
    normalDiameter * 1.25
  );
}


// =====================================================
// 找网格
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
    normalDiameter * 0.55;


  let rowGroups =
    clusterValues(
      anchors.map(p => p.y),
      roughTolerance
    );


  let colGroups =
    clusterValues(
      anchors.map(p => p.x),
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


  // 路单最多6行
  // 如果识别出超过6行，
  // 优先保留拥有候选圆最多的6组

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


  // 如果当前截图某些行没有结果，
  // 根据已有行补成标准6行

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
      let nearestDist = Infinity;


      rowCenters.forEach(y => {

        const d =
          Math.abs(
            y -
            expected
          );


        if (
          d < nearestDist
        ) {

          nearest = y;
          nearestDist = d;
        }
      });


      if (
        nearest !== null &&
        nearestDist <
          rowSpacing * 0.42
      ) {

        generated.push(nearest);

      } else {

        generated.push(expected);
      }
    }


    rowCenters =
      generated;
  }


  rowCenters =
    rowCenters
      .sort(
        (a, b) => a - b
      )
      .slice(0, 6);


  colCenters =
    colCenters
      .sort(
        (a, b) => a - b
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
// 在一个格子的中心区域统计颜色
//
// 关键：
//
// 不根据“小红点”生成独立结果。
// 只看这个格子整体是哪种颜色占主导。
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


  let counts = {

    B: 0,
    P: 0,
    T: 0
  };


  let totalSampled = 0;


  const radius =
    Math.max(
      4,
      Math.floor(sampleRadius)
    );


  const radiusSq =
    radius * radius;


  const minX =
    Math.max(
      0,
      Math.floor(cx - radius)
    );

  const maxX =
    Math.min(
      width - 1,
      Math.ceil(cx + radius)
    );

  const minY =
    Math.max(
      0,
      Math.floor(cy - radius)
    );

  const maxY =
    Math.min(
      height - 1,
      Math.ceil(cy + radius)
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
      b[1] - a[1]
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


  // 空格 / 只有很小的附加标记
  if (
    bestCount < 7 ||
    coverage < 0.025
  ) {
    return null;
  }


  /*
   * B/P 主体 + 小红/蓝对子标记：
   *
   * 主体颜色像素通常明显更多。
   * 小点即使存在，也不会抢走这个格子。
   */

  if (
    secondCount > 0 &&
    bestCount <
      secondCount * 1.18
  ) {

    /*
     * 两种颜色非常接近时，
     * 再检查更靠近中心的小区域。
     */

    const centerRadius =
      Math.max(
        3,
        radius * 0.48
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
        b[1] - a[1]
    );


    if (
      centerEntries[0][1] >
      centerEntries[1][1]
    ) {

      return centerEntries[0][0];
    }
  }


  return bestType;
}


// =====================================================
// 按网格读取
//
// 每列：上 -> 下
// 再进入右边下一列
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
      normalDiameter * 0.52,
      Math.min(
        grid.rowSpacing,
        grid.colSpacing
      ) * 0.34
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
// 识别图片
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
        willReadFrequently: true
      }
    );


  /*
   * 手机性能：
   * 最大宽度1000
   */

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


  /*
   * 1：
   * 找所有颜色区域
   */

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


  /*
   * 2：
   * 估计正常大圆尺寸
   */

  const normalDiameter =
    estimateNormalDiameter(
      components
    );


  /*
   * 3：
   * 只拿大圆建立网格
   *
   * 小红点、小蓝点不会参与建格
   */

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


  /*
   * 4：
   * 建立6行网格
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
   * 5：
   * 每格只判断一次
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
// 导入识别结果
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
   * T会显示在识别顺序，
   * 但不会进入预测历史。
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


  recomputeFromHistory(
    bpSequence
  );


  renderHistory();

  updateView();


  return {

    bpCount:
      bpSequence.length,

    tieCount
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
          '正在建立6行网格并识别，请稍等……';
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
              '没有识别到路单'
            );
          }


          const imported =
            importRecognizedSequence(
              result.sequence
            );


          const originalText =
            result.sequence.join('');


          if (status) {

            status.textContent =
              `✅ 网格识别完成\n` +
              `识别顺序：${originalText}\n` +
              `已导入庄/闲：${imported.bpCount}手\n` +
              `识别到和：${imported.tieCount}手（T不进入预测）`;
          }


        } catch (err) {

          console.error(err);


          if (status) {

            status.textContent =
              `❌ 识别失败：${err.message || String(err)}\n` +
              `请使用矩形截图，尽量完整框住6行路单区域。`;
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
            '❌ 图片读取失败，请重新选择截图。';
        }


        setButtonsDisabled(false);

        URL.revokeObjectURL(url);
      };


      img.src = url;
    }
  );
}


// =====================================================
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

二、截图识别
1. 手机先截取路单。
2. 推荐使用矩形截图。
3. 尽量完整保留6行路单区域。
4. 点击“📷 截图识别”。
5. 选择截图。
6. 系统先建立6行网格。
7. 然后逐格判断：
   红色 = B
   蓝色 = P
   绿色 = T
8. 每个格子最多产生一个结果。
9. 小红点、小蓝点不会独立算一手。
10. T会出现在识别顺序里，但不会进入B/P预测历史。

读取顺序：
每列从上往下，
然后进入右边下一列。`;
  }


  if (modal) {

    modal
      .classList
      .remove('hidden');
  }
};


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


// =====================================================
// 初始化
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  function() {

    renderHistory();

    showTextOnly(
      '就绪：可手动输入B/P，也可以点击“📷 截图识别”直接导入路单。'
    );

    updateView();

    setupImageRecognition();
  }
);

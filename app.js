/* =====================================================
   AI 预测系统
   app.js V12 稳定版

   截图识别原则：

   红圈 = B
   蓝圈 = P

   绿色完全忽略
   不识别和
   不统计和

   本版重点修复：

   1. 同一个圆被绿色斜杠切开后，
      红/蓝碎片先重新合并，
      防止一个圆被识别成两手。

   2. 过滤图片最左/最右边缘的小碎片，
      防止开头凭空多一个P/B。

   3. 不自动补空格。
   4. 不自动补弱格。
   5. 不根据整列强行增加手数。
   6. 同一竖列颜色只用于判断B/P。
   7. 真正检测到一个圆才算一手。
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

  /* phase 0 */

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


  /* phase 1 */

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


  /* phase 2 */

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

   只认红、蓝。

   绿色完全忽略。
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


  /*
    很小的噪声先过滤。
  */

  const minArea =
    Math.max(
      3,
      Math.floor(
        total *
        0.0000012
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

            visited[ni] =
              1;


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

    return (
      values[
        middle
      ]
    );
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


  /*
    去掉最小的碎片，
    防止绿线切开后的细碎部分
    把圆大小估小。
  */

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
   估算正常主体面积
   ===================================================== */

function estimateMarkerArea(
  components
) {

  const areas =
    components
      .map(c =>
        c.area
      )
      .filter(a =>
        a > 0
      )
      .sort(
        (a, b) =>
          a - b
      );


  if (
    !areas.length
  ) {

    return 10;
  }


  /*
    使用较大的60%区域，
    避免碎片把正常面积拉低。
  */

  const start =
    Math.floor(
      areas.length *
      0.40
    );


  const usable =
    areas.slice(
      start
    );


  return (
    median(usable)
    ||
    median(areas)
    ||
    10
  );
}


/* =====================================================
   初步过滤噪声

   本次新增：
   图片边缘的小碎片需要更严格过滤。
   ===================================================== */

function filterComponents(
  components,
  markerSize,
  markerArea,
  width,
  height
) {

  const normalMinArea =
    Math.max(
      3,
      markerArea *
      0.10
    );


  /*
    贴边碎片要求更高。

    就是为了防止最左边
    莫名其妙多一个P。
  */

  const edgeMinArea =
    Math.max(
      normalMinArea,
      markerArea *
      0.30
    );


  const edgeZone =
    markerSize *
    0.45;


  const maxSize =
    markerSize *
    2.0;


  return components.filter(c => {

    const big =
      Math.max(
        c.width,
        c.height
      );


    const small =
      Math.min(
        c.width,
        c.height
      );


    if (
      big >
      maxSize
    ) {

      return false;
    }


    /*
      太细长，
      不像圆弧主体。
  */

    if (
      small /
      Math.max(
        big,
        1
      )
      <
      0.12
    ) {

      return false;
    }


    const nearLeft =
      c.minX <
      edgeZone;


    const nearRight =
      c.maxX >
      width -
      edgeZone;


    /*
      靠最左、最右边时，
      必须有更大的有效面积。

      小小一块蓝色边缘
      不允许成为一手。
  */

    if (
      nearLeft ||
      nearRight
    ) {

      if (
        c.area <
        edgeMinArea
      ) {

        return false;
      }


      /*
        贴边并且特别窄，
        也当作残片过滤。
  */

      if (
        c.width <
        markerSize *
        0.26
      ) {

        return false;
      }
    }


    if (
      c.area <
      normalMinArea
    ) {

      return false;
    }


    return true;
  });
}


/* =====================================================
   把同一个圆被切开的碎片合并

   本版非常关键。

   绿色斜杠可能把一个蓝圈/红圈
   切成左右两个碎片。

   如果不合并，
   就可能出现：
   一局 = 两手。

   现在先把同一横向位置、
   同一高度附近的碎片合成一个marker。
   ===================================================== */

function mergeMarkerFragments(
  components,
  markerSize
) {

  const used =
    new Uint8Array(
      components.length
    );


  const merged = [];


  /*
    同一圆碎片：

    Y必须很接近；
    X可以相对宽一些，
    因为绿斜线可能把圆左右切开。
  */

  const maxDx =
    markerSize *
    1.05;


  const maxDy =
    markerSize *
    0.42;


  for (
    let i = 0;
    i < components.length;
    i++
  ) {

    if (
      used[i]
    ) {

      continue;
    }


    const queue =
      [i];


    used[i] = 1;


    const group = [];


    while (
      queue.length
    ) {

      const index =
        queue.shift();


      const current =
        components[index];


      group.push(
        current
      );


      for (
        let j = 0;
        j < components.length;
        j++
      ) {

        if (
          used[j]
        ) {

          continue;
        }


        const other =
          components[j];


        /*
          同一个真实圆的碎片
          应该主体颜色一致。

          红碎片不和蓝碎片合并。
  */

        if (
          other.side !==
          current.side
        ) {

          continue;
        }


        const dx =
          Math.abs(
            other.x -
            current.x
          );


        const dy =
          Math.abs(
            other.y -
            current.y
          );


        if (
          dx <= maxDx &&
          dy <= maxDy
        ) {

          used[j] = 1;

          queue.push(j);
        }
      }
    }


    let area = 0;

    let weightedX = 0;

    let weightedY = 0;


    let minX =
      Infinity;

    let maxX =
      -Infinity;

    let minY =
      Infinity;

    let maxY =
      -Infinity;


    group.forEach(item => {

      area +=
        item.area;


      weightedX +=
        item.x *
        item.area;


      weightedY +=
        item.y *
        item.area;


      minX =
        Math.min(
          minX,
          item.minX
        );


      maxX =
        Math.max(
          maxX,
          item.maxX
        );


      minY =
        Math.min(
          minY,
          item.minY
        );


      maxY =
        Math.max(
          maxY,
          item.maxY
        );
    });


    if (
      area <= 0
    ) {

      continue;
    }


    merged.push({

      side:
        group[0].side,

      area,

      x:
        weightedX /
        area,

      y:
        weightedY /
        area,

      minX,

      maxX,

      minY,

      maxY,

      width:
        maxX -
        minX +
        1,

      height:
        maxY -
        minY +
        1
    });
  }


  return merged;
}


/* =====================================================
   再过滤一次合并后的marker

   防止边缘一个小碎片
   通过第一次过滤后仍被当成手数。
   ===================================================== */

function filterMergedMarkers(
  markers,
  markerSize,
  width
) {

  if (
    !markers.length
  ) {

    return [];
  }


  const areas =
    markers
      .map(x =>
        x.area
      )
      .sort(
        (a, b) =>
          a - b
      );


  const typicalArea =
    median(
      areas.slice(
        Math.floor(
          areas.length *
          0.30
        )
      )
    )
    ||
    median(areas);


  const edgeZone =
    markerSize *
    0.55;


  return markers.filter(marker => {

    /*
      普通位置：
      允许圆被绿线切掉较大一部分。
  */

    if (
      marker.area <
      typicalArea *
      0.16
    ) {

      return false;
    }


    const nearLeft =
      marker.x <
      edgeZone;


    const nearRight =
      marker.x >
      width -
      edgeZone;


    /*
      最左最右更严格。

      专门防止开头多一个P/B。
  */

    if (
      nearLeft ||
      nearRight
    ) {

      if (
        marker.area <
        typicalArea *
        0.42
      ) {

        return false;
      }


      if (
        marker.width <
        markerSize *
        0.35
      ) {

        return false;
      }
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
   按真实圆建立竖列

   同列只决定颜色，
   不补空格。
   ===================================================== */

function buildRealColumns(
  markers,
  markerSize
) {

  /*
    相同竖列X位置应接近。

    这里比旧版收紧，
    防止两个相邻列误并。
  */

  const xTolerance =
    Math.max(
      3,
      markerSize *
      0.46
    );


  const rawColumns =
    clusterNumbers(
      markers,
      item =>
        item.x,
      xTolerance
    );


  const columns = [];


  rawColumns.forEach(group => {

    /*
      同一竖列按照Y排序。
  */

    const sorted =
      [...group.items]
        .sort(
          (a, b) =>
            a.y -
            b.y
        );


    /*
      防止同一个真实圆
      因为残余碎片仍重复。

      Y特别近的两个marker再合并一次。
  */

    const cells = [];


    const yMerge =
      markerSize *
      0.48;


    sorted.forEach(marker => {

      const last =
        cells[
          cells.length - 1
        ];


      if (
        last &&
        Math.abs(
          marker.y -
          last.y
        )
        <=
        yMerge
      ) {

        /*
          同一位置重复marker，
          合并成一手。
  */

        const totalArea =
          last.area +
          marker.area;


        last.x =
          (
            last.x *
            last.area
            +
            marker.x *
            marker.area
          )
          /
          totalArea;


        last.y =
          (
            last.y *
            last.area
            +
            marker.y *
            marker.area
          )
          /
          totalArea;


        last.area =
          totalArea;


        last.redArea +=
          marker.side === 'B'
            ?
            marker.area
            :
            0;


        last.blueArea +=
          marker.side === 'P'
            ?
            marker.area
            :
            0;


        return;
      }


      cells.push({

        x:
          marker.x,

        y:
          marker.y,

        area:
          marker.area,

        redArea:
          marker.side === 'B'
            ?
            marker.area
            :
            0,

        blueArea:
          marker.side === 'P'
            ?
            marker.area
            :
            0
      });
    });


    if (
      !cells.length
    ) {

      return;
    }


    /*
      一列最多6格。

      超过6说明定位异常，
      宁可报错也不乱灌数据。
  */

    if (
      cells.length >
      6
    ) {

      throw new Error(
        '某一竖排识别超过6手，请重新截取完整路单区域'
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
      如果同列红蓝太接近，
      不要乱猜。
  */

    if (
      weak > 0 &&
      dominant <
      weak *
      1.18
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
   最左列额外安全过滤

   专门解决：

   49局 -> 50局
   开头多一个P

   如果最左一列只有一个特别弱的圆，
   并且与下一列距离明显异常小，
   判断它更可能是同一个圆的残片，
   删除这个假列。
   ===================================================== */

function removeFalseFirstColumn(
  columns,
  markerSize
) {

  if (
    columns.length <
    2
  ) {

    return columns;
  }


  const first =
    columns[0];


  const second =
    columns[1];


  const distance =
    second.x -
    first.x;


  /*
    正常相邻两列中心距离
    不会明显小于圆直径。

    如果第一列和第二列靠得过近，
    第一列又只有一个结果，
    很可能就是碎片被拆成假列。
  */

  if (
    first.cells.length === 1 &&
    distance <
    markerSize *
    0.78
  ) {

    return columns.slice(
      1
    );
  }


  return columns;
}


/* =====================================================
   转最终B/P顺序
   ===================================================== */

function columnsToSequence(
  columns
) {

  const sequence = [];


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
    尽量保留清晰度。
  */

  const maxWidth =
    1800;


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
    红、蓝分别寻找区域
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
    估算正常圆大小和面积
  */

  const markerSize =
    estimateMarkerSize(
      components
    );


  const markerArea =
    estimateMarkerArea(
      components
    );


  /*
    4.
    第一次噪点/边缘过滤
  */

  components =
    filterComponents(
      components,
      markerSize,
      markerArea,
      w,
      h
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
    合并同一个圆被绿线切开的碎片

    这是本版主要修复。
  */

  let markers =
    mergeMarkerFragments(
      components,
      markerSize
    );


  /*
    6.
    合并后再做一次边缘过滤
  */

  markers =
    filterMergedMarkers(
      markers,
      markerSize,
      w
    );


  if (
    markers.length <
    2
  ) {

    throw new Error(
      '有效B/P圆太少'
    );
  }


  /*
    7.
    按真实圆建立真实列。

    不猜空列。
    不补空格。
  */

  let columns =
    buildRealColumns(
      markers,
      markerSize
    );


  if (
    !columns.length
  ) {

    throw new Error(
      '没有识别到有效路单'
    );
  }


  /*
    8.
    专门过滤最左边假列

    解决开头多一个P/B。
  */

  columns =
    removeFalseFirstColumn(
      columns,
      markerSize
    );


  /*
    9.
    转最终顺序
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
    防止明显异常数据直接导入。
  */

  if (
    sequence.length >
    120
  ) {

    throw new Error(
      `识别异常：检测到${sequence.length}手，已停止导入`
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
   导入识别结果
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
    没按Reset就继续追加。

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

程序只识别：

红圈 = B
蓝圈 = P

绿色全部忽略。

不识别和。
不统计和。


本版已经关闭：

自动补空格
自动补弱格
自动补列
自动增加手数


每一个B/P都必须
在图片里真实检测到。


如果绿色斜杠把一个红圈或蓝圈
切成两个碎片，

程序会先把碎片重新合并，
只算一手。


图片最左、最右边缘
如果只有很小的红蓝残片，

程序不会把它算成一手。


同一竖排颜色
只用来判断：

这一列是B还是P。

不会用于增加手数。


读取顺序：

从左到右，

每列从上到下。


【追加】

没按Reset：

每一次截图识别的B/P
继续追加到历史。

手动输入P/B
也继续追加。


【Back】

删除最后一个B/P，
重新计算。


【Reset】

唯一清零方式。


【统计】

第91个B/P开始：

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

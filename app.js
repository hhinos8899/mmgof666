/* =====================================================
   AI预测系统
   app.js V16

   截图识别：
   红 = B
   蓝 = P
   绿色完全忽略

   核心变化：
   不再使用“连通块数量 = 手数”。

   改成：
   1. 珠盘区域固定6行
   2. 自动寻找横向格距和网格起点
   3. 每一个格子只检查一次
   4. 一个格子最多只能产生1个B/P
   5. 绿色不会增加手数
   6. 不自动补格
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
   状态
   ===================================================== */

let gameHistory = [];

let waiting = false;

/*
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

  document
    .querySelectorAll('.btn')
    .forEach(btn => {

      btn.disabled =
        disabled;
    });
}


/* =====================================================
   预测标签
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


  requestAnimationFrame(
    () => {

      recordDisplay.scrollTop =
        recordDisplay.scrollHeight;
    }
  );
}


/* =====================================================
   统计
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


  const map = {

    statTotal:
      predictionTotal,

    statHits:
      predictionHits,

    statMisses:
      misses,

    statWinStreak:
      currentWinStreak,

    statLoseStreak:
      currentLoseStreak,

    statMaxWin:
      maxWinStreak,

    statMaxLose:
      maxLoseStreak,

    statRate:
      getHitRate()
  };


  Object.keys(map)
    .forEach(id => {

      const el =
        byId(id);

      if (el) {

        el.textContent =
          map[id];
      }
    });
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

    return `第${realHand}手`;
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


  const group =
    LOOP_GROUPS[
      loopGroupIdx %
      LOOP_GROUPS.length
    ];


  return group[
    loopPos
  ];
}


/* =====================================================
   预测推进
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


    if (
      actual === pred
    ) {

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


  const group =
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
      `当前组 ${group}｜` +
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


  arr.forEach(result => {

    gameHistory.push(
      result
    );


    advanceAfterInput(
      result
    );
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


  try {

    gameHistory.push(
      type
    );


    advanceAfterInput(
      type
    );


    renderHistory();

    renderPredictionStats();

    updateView();

  } finally {

    waiting = false;


    setButtonsDisabled(
      false
    );
  }
};


/* =====================================================
   Back
   ===================================================== */

window.undoLastMove =
function() {

  if (
    waiting ||
    !gameHistory.length
  ) {

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

    v:
      max
  };
}


/* =====================================================
   红蓝颜色判断
   绿色和其它颜色直接忽略
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
    hsv.s < 0.22 ||
    hsv.v < 0.23
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
    hsv.h <= 265
  ) {

    return 'P';
  }


  return null;
}


/* =====================================================
   建立红蓝 Mask
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


    const side =
      classifyColor(
        data[p],
        data[p + 1],
        data[p + 2],
        data[p + 3]
      );


    if (
      side === 'B'
    ) {

      red[i] = 1;

    } else if (
      side === 'P'
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

  const stride =
    width + 1;


  const out =
    new Uint32Array(
      (
        width + 1
      )
      *
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


      out[
        y *
        stride +
        x
      ] =
        out[
          (
            y - 1
          )
          *
          stride +
          x
        ]
        +
        rowSum;
    }
  }


  return {

    data:
      out,

    stride
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


  const s =
    integral.stride;


  const d =
    integral.data;


  return (
    d[
      y2 * s +
      x2
    ]
    -
    d[
      y1 * s +
      x2
    ]
    -
    d[
      y2 * s +
      x1
    ]
    +
    d[
      y1 * s +
      x1
    ]
  );
}


/* =====================================================
   一个格子的红蓝数量

   注意：
   一个格子最后最多只产生一次结果
   ===================================================== */

function getCellCounts(
  integrals,
  cx,
  cy,
  halfW,
  halfH,
  width,
  height
) {

  const x1 =
    cx -
    halfW;


  const x2 =
    cx +
    halfW;


  const y1 =
    cy -
    halfH;


  const y2 =
    cy +
    halfH;


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
   判断格子是否真的有 B/P
   ===================================================== */

function classifyGridCell(
  counts,
  sampleArea
) {

  const red =
    counts.red;


  const blue =
    counts.blue;


  const best =
    Math.max(
      red,
      blue
    );


  const weak =
    Math.min(
      red,
      blue
    );


  /*
    根据格子大小动态决定最低像素数。
    红蓝圈只是圆环，
    所以比例不能设得太高。
  */

  const minPixels =
    Math.max(
      3,
      Math.floor(
        sampleArea *
        0.012
      )
    );


  if (
    best <
    minPixels
  ) {

    return null;
  }


  /*
    如果两种颜色都有，
    主颜色必须明显占优。
  */

  if (
    weak >= 3 &&
    best <
    weak *
    1.22
  ) {

    return null;
  }


  return (
    red >= blue
      ? 'B'
      : 'P'
  );
}


/* =====================================================
   V16核心：
   自动寻找固定6行网格

   不寻找红蓝圆的数量，
   而是寻找最符合“6行格子”的位置。
   ===================================================== */

function findFixedSixRowGrid(
  integrals,
  width,
  height
) {

  /*
    用户截图的就是路单区域，
    所以6行高度基本占满图片。

    给纵向留一点容差。
  */

  const approxRowSpacing =
    height /
    6;


  let best =
    null;


  /*
    纵向格距只允许轻微变化。
  */

  const minRowSpacing =
    approxRowSpacing *
    0.92;


  const maxRowSpacing =
    approxRowSpacing *
    1.06;


  const rowStep =
    Math.max(
      0.25,
      approxRowSpacing *
      0.018
    );


  for (
    let rowSpacing =
      minRowSpacing;

    rowSpacing <=
      maxRowSpacing;

    rowSpacing +=
      rowStep
  ) {

    /*
      第一行中心通常接近半格位置。
    */

    const minY0 =
      rowSpacing *
      0.30;


    const maxY0 =
      Math.min(
        rowSpacing *
        0.72,
        height -
        rowSpacing *
        5
      );


    const yStep =
      Math.max(
        0.35,
        rowSpacing *
        0.035
      );


    for (
      let y0 =
        minY0;

      y0 <=
        maxY0;

      y0 +=
        yStep
    ) {

      /*
        横向格距原则上接近纵向格距。
      */

      const minColSpacing =
        rowSpacing *
        0.82;


      const maxColSpacing =
        rowSpacing *
        1.18;


      const colStep =
        Math.max(
          0.35,
          rowSpacing *
          0.025
        );


      for (
        let colSpacing =
          minColSpacing;

        colSpacing <=
          maxColSpacing;

        colSpacing +=
          colStep
      ) {

        const xStep =
          Math.max(
            0.4,
            colSpacing /
            18
          );


        /*
          一个周期内搜索第一列中心。
        */

        for (
          let x0 =
            0;

          x0 <
            colSpacing;

          x0 +=
            xStep
        ) {

          const halfW =
            colSpacing *
            0.35;


          const halfH =
            rowSpacing *
            0.35;


          const sampleArea =
            (
              halfW *
              2
            )
            *
            (
              halfH *
              2
            );


          let occupied =
            0;


          let colorPixels =
            0;


          let ambiguous =
            0;


          const maxCols =
            Math.ceil(
              width /
              colSpacing
            )
            +
            2;


          for (
            let c = 0;
            c < maxCols;
            c++
          ) {

            const cx =
              x0 +
              c *
              colSpacing;


            if (
              cx <
              -colSpacing *
              0.3 ||
              cx >
              width +
              colSpacing *
              0.3
            ) {

              continue;
            }


            for (
              let r = 0;
              r < 6;
              r++
            ) {

              const cy =
                y0 +
                r *
                rowSpacing;


              if (
                cy < 0 ||
                cy > height
              ) {

                continue;
              }


              const counts =
                getCellCounts(
                  integrals,
                  cx,
                  cy,
                  halfW,
                  halfH,
                  width,
                  height
                );


              const side =
                classifyGridCell(
                  counts,
                  sampleArea
                );


              if (side) {

                occupied++;


                colorPixels +=
                  Math.max(
                    counts.red,
                    counts.blue
                  );


                const weak =
                  Math.min(
                    counts.red,
                    counts.blue
                  );


                if (
                  weak >
                  Math.max(
                    counts.red,
                    counts.blue
                  )
                  *
                  0.55
                ) {

                  ambiguous++;
                }
              }
            }
          }


          /*
            正确网格：
            - 能覆盖最多真实结果格
            - 圆心附近颜色量更高
            - 红蓝混杂更少
          */

          const score =
            occupied *
            100
            +
            colorPixels *
            0.12
            -
            ambiguous *
            35;


          if (
            !best ||
            score >
            best.score
          ) {

            best = {

              score,

              rowSpacing,

              colSpacing,

              x0,

              y0,

              occupied
            };
          }
        }
      }
    }
  }


  if (!best) {

    throw new Error(
      '无法定位6行珠盘网格'
    );
  }


  return best;
}


/* =====================================================
   根据固定网格逐格读取

   重要：
   一个格子最多 push 一次。
   所以一个圆绝不会因为被切开而变两手。
   ===================================================== */

function readFixedGrid(
  integrals,
  grid,
  width,
  height
) {

  const columns = [];


  const halfW =
    grid.colSpacing *
    0.36;


  const halfH =
    grid.rowSpacing *
    0.36;


  const sampleArea =
    (
      halfW *
      2
    )
    *
    (
      halfH *
      2
    );


  /*
    将 x0 调整到画面最左边附近的
    第一个网格中心。
  */

  let firstX =
    grid.x0;


  while (
    firstX -
    grid.colSpacing >
    -grid.colSpacing *
    0.35
  ) {

    firstX -=
      grid.colSpacing;
  }


  while (
    firstX <
    -grid.colSpacing *
    0.35
  ) {

    firstX +=
      grid.colSpacing;
  }


  const maxCols =
    Math.ceil(
      width /
      grid.colSpacing
    )
    +
    2;


  for (
    let c = 0;
    c < maxCols;
    c++
  ) {

    const cx =
      firstX +
      c *
      grid.colSpacing;


    if (
      cx >
      width +
      grid.colSpacing *
      0.3
    ) {

      break;
    }


    const cells = [];


    let totalRed = 0;

    let totalBlue = 0;


    /*
      这一列6个格子，每个格子只判断一次。
    */

    for (
      let r = 0;
      r < 6;
      r++
    ) {

      const cy =
        grid.y0 +
        r *
        grid.rowSpacing;


      if (
        cy < 0 ||
        cy > height
      ) {

        cells.push(
          null
        );

        continue;
      }


      const counts =
        getCellCounts(
          integrals,
          cx,
          cy,
          halfW,
          halfH,
          width,
          height
        );


      const side =
        classifyGridCell(
          counts,
          sampleArea
        );


      cells.push(
        side
      );


      if (side) {

        totalRed +=
          counts.red;


        totalBlue +=
          counts.blue;
      }
    }


    const occupiedCount =
      cells.filter(
        Boolean
      ).length;


    if (
      occupiedCount === 0
    ) {

      columns.push({

        x:
          cx,

        empty:
          true,

        cells
      });


      continue;
    }


    /*
      同一竖排只允许一种主体 B/P。

      这里只纠正颜色，
      不增加任何格子。
    */

    let columnSide =
      null;


    if (
      totalRed >
      totalBlue *
      1.08
    ) {

      columnSide =
        'B';

    } else if (
      totalBlue >
      totalRed *
      1.08
    ) {

      columnSide =
        'P';
    }


    columns.push({

      x:
        cx,

      empty:
        false,

      side:
        columnSide,

      cells
    });
  }


  /*
    去掉最左、最右的连续空列。
  */

  while (
    columns.length &&
    columns[0].empty
  ) {

    columns.shift();
  }


  while (
    columns.length &&
    columns[
      columns.length - 1
    ].empty
  ) {

    columns.pop();
  }


  if (!columns.length) {

    throw new Error(
      '没有识别到B/P'
    );
  }


  const sequence = [];


  let occupiedCells =
    0;


  columns.forEach(column => {

    if (column.empty) {

      return;
    }


    column.cells
      .forEach(cellSide => {

        if (!cellSide) {

          return;
        }


        /*
          一格只能输出一次。

          如果整列颜色足够明确，
          使用整列主体颜色。

          否则使用格子自身颜色。
        */

        sequence.push(
          column.side
          ||
          cellSide
        );


        occupiedCells++;
      });
  });


  return {

    sequence,

    columns:
      columns.filter(
        col =>
          !col.empty
      ).length,

    occupiedCells
  };
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
    这个算法不需要超高分辨率。
    限制宽度能让电脑和手机都更快。
  */

  const maxWidth =
    900;


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


  if (
    w < 30 ||
    h < 30
  ) {

    throw new Error(
      '截图尺寸太小'
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
    只建立红/蓝Mask。
    绿色从这里开始就不存在了。
  */

  const masks =
    createSideMasks(
      imageData,
      w,
      h
    );


  /*
    2.
    Integral Image。
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
    找固定6行网格。
  */

  const grid =
    findFixedSixRowGrid(
      integrals,
      w,
      h
    );


  /*
    4.
    每格只读取一次。
  */

  const read =
    readFixedGrid(
      integrals,
      grid,
      w,
      h
    );


  if (
    !read.sequence.length
  ) {

    throw new Error(
      '没有识别到庄或闲'
    );
  }


  /*
    安全保护。
  */

  if (
    read.sequence.length >
    100
  ) {

    throw new Error(
      `识别结果异常：${read.sequence.length}手，已停止导入`
    );
  }


  return {

    sequence:
      read.sequence,

    bpCount:
      read.sequence.length,

    columns:
      read.columns,

    width:
      w,

    height:
      h,

    rowSpacing:
      grid.rowSpacing,

    colSpacing:
      grid.colSpacing
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
      result =>
        result === 'B' ||
        result === 'P'
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
          '正在按6行固定网格识别B/P……';
      }


      waiting = true;


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

        /*
          先让浏览器有机会刷新界面，
          再开始计算。

          避免看起来像按钮卡死。
        */

        setTimeout(
          () => {

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

              waiting = false;


              setButtonsDisabled(
                false
              );


              URL.revokeObjectURL(
                url
              );
            }

          },
          20
        );
      };


      img.onerror =
      function() {

        waiting = false;


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
`V16 使用规则：

【截图识别】

只截图珠盘路区域。

程序只识别：

红圈 = B
蓝圈 = P

绿色完全忽略。

不识别和。
不统计和。


【V16识别方式】

现在不再通过
“找到几个红蓝碎片”
来计算手数。

程序会先建立：

固定6行珠盘网格。

然后每一个格子
只检查一次。

每个格子只有三种结果：

B
P
空


所以即使绿色斜线
把一个圆切成两块，

因为它仍然处于
同一个格子，

最终最多只会产生一手。


不会自动补空格。

不会自动补弱格。

不会因为上下有结果
凭空增加手数。


同一竖排的颜色规则
只用于辅助判断B/P，

不会增加格子。


读取顺序：

从左到右。

每列从上到下。


【追加】

只要没有点击Reset：

截图识别的B/P
全部继续追加。

手动点击P/B
也继续追加。


【Back】

删除最后一个B/P，

然后根据剩余全部历史
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

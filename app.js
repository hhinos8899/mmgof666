/**
 * 最终要求：
 * 1) 套入24手阶段：不预测，只提示当前需要命中哪组三连
 * 2) 套完24手后：进入门槛PBP（虚拟25/26/27）
 * 3) 门槛三手里至少中1手 -> 才开始后面逐手预测
 * 4) 过门槛后从BBP开始循环
 * 5) 截图识别：
 *    红 = B
 *    蓝 = P
 *    绿 = T
 * 6) T识别但不进入B/P预测历史
 * 7) 新增尺寸过滤，避免小红点/小蓝点被误识别成独立B/P
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
  GROUPS.slice(1).concat(GROUPS.slice(0,1));

let gameHistory = [];
let waiting = false;

// phase：0套入，1门槛，2预测
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


// =========================
// DOM
// =========================

function byId(id){
  return document.getElementById(id);
}

function $(sel){
  return document.querySelector(sel);
}


// =========================
// 按钮状态
// =========================

function setButtonsDisabled(disabled){

  const p = $('.player-btn');
  const b = $('.banker-btn');
  const back = $('.back-btn');
  const reset = $('.reset-btn');
  const scan = $('.scan-btn');

  if(p) p.disabled = disabled;
  if(b) b.disabled = disabled;
  if(back) back.disabled = disabled;
  if(reset) reset.disabled = disabled;
  if(scan) scan.disabled = disabled;
}


// =========================
// AI标签
// =========================

function setLabelAI(){

  const label = byId('resultLabel');

  if(label){

    label.textContent = 'AI';

    label.classList.remove(
      'player',
      'banker'
    );
  }
}

function setLabelSide(side){

  const label = byId('resultLabel');

  if(!label) return;

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


// =========================
// 显示文字
// =========================

function showTextOnly(msg){

  setLabelAI();

  const pctEl = byId('resultPct');
  const text = byId('predictionText');

  if(pctEl)
    pctEl.textContent = '';

  if(text)
    text.textContent = msg;
}


// =========================
// 历史记录
// =========================

function renderHistory(){

  const recordDisplay =
    byId('recordDisplay');

  if(!recordDisplay)
    return;

  recordDisplay.innerHTML = '';

  gameHistory.forEach(type=>{

    const item =
      document.createElement('div');

    item.className =
      `record-item ${type.toLowerCase()}`;

    item.textContent = type;

    recordDisplay.appendChild(item);
  });
}


// =========================
// 虚拟手数
// =========================

function virtualHandFor(realHand){

  if(!completedAtRealHand)
    return null;

  if(phase === 1){

    return 25 + gateStep;
  }

  if(phase === 2){

    if(!phase2StartRealHand)
      return null;

    return 28 +
      (
        realHand -
        phase2StartRealHand
      );
  }

  return null;
}

function fmtHand(realHand){

  const v =
    virtualHandFor(realHand);

  if(v === null)
    return `第${realHand}手`;

  return `第${realHand}手(${v}手)`;
}


// =========================
// 下一手预测
// =========================

function nextPredLetter(){

  if(phase === 1){

    return "PBP"[gateStep];
  }

  const g =
    LOOP_GROUPS[
      loopGroupIdx %
      LOOP_GROUPS.length
    ];

  return g[loopPos];
}


// =========================
// 核心推进
// =========================

function advanceAfterInput(actual){

  // =====================
  // phase 0：套入24手
  // =====================

  if(phase === 0){

    const need =
      GROUPS[matchIdx];

    if(
      actual ===
      need[phase0Cursor]
    ){

      phase0Cursor++;

      if(
        phase0Cursor ===
        need.length
      ){

        matchIdx++;
        phase0Cursor = 0;

        if(
          matchIdx >=
          GROUPS.length
        ){

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

  if(phase === 1){

    const pred =
      "PBP"[gateStep];

    const hit =
      actual === pred;

    if(hit)
      gateHits++;

    const realHand =
      gameHistory.length;

    lastGateLine =
      `门槛阶段：${fmtHand(realHand)}\n` +
      `本手结果=${actual}｜本手门槛预测=${pred}\n` +
      `进度：${gateStep + 1}/3｜累计命中：${gateHits}/3\n` +
      `（必须走满3手，三手里至少中1手才开始后面逐手预测）`;

    gateStep++;

    if(gateStep < 3)
      return;

    if(gateHits >= 1){

      phase = 2;

      phase2StartRealHand =
        gameHistory.length + 1;

      loopGroupIdx = 0;
      loopPos = 0;

    }else{

      gateStep = 0;
      gateHits = 0;
    }

    return;
  }


  // =====================
  // phase 2：正式预测
  // =====================

  if(phase === 2){

    loopPos++;

    if(loopPos >= 3){

      loopPos = 0;

      loopGroupIdx =
        (
          loopGroupIdx + 1
        ) %
        LOOP_GROUPS.length;
    }
  }
}


// =========================
// 更新页面
// =========================

function updateView(){

  const upcomingReal =
    gameHistory.length + 1;

  if(phase === 0){

    const need =
      GROUPS[matchIdx];

    showTextOnly(
      `套入24手中：当前需要命中 ${need}\n` +
      `（顺序命中即可，中间允许插，不预测）`
    );

    return;
  }


  if(phase === 1){

    const p =
      nextPredLetter();

    setLabelSide(p);

    const text =
      byId('predictionText');

    if(text){

      text.textContent =
        `✅ 第${completedAtRealHand}手(24手)已套完\n` +
        (
          lastGateLine ||
          `门槛：${fmtHand(upcomingReal)}（25/26/27必须走满3手再判定）`
        );
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

  if(text){

    text.textContent =
      `✅ 已过门槛（PBP三手至少中1手）\n` +
      `依次预测：${fmtHand(upcomingReal)}\n` +
      `当前组：${g}（第${loopPos+1}/3）｜本手预测：${p}`;
  }
}


// =========================
// 重算
// =========================

function recomputeFromHistory(arr){

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

  arr.forEach(x=>{

    gameHistory.push(x);

    advanceAfterInput(x);
  });
}


// =========================
// 手动输入
// =========================

window.recordResult =
function(type){

  if(waiting)
    return;

  if(
    type !== 'B' &&
    type !== 'P'
  )
    return;

  waiting = true;

  setButtonsDisabled(true);

  gameHistory.push(type);

  renderHistory();

  advanceAfterInput(type);

  updateView();

  waiting = false;

  setButtonsDisabled(false);
};


// =========================
// Back
// =========================

window.undoLastMove =
function(){

  if(waiting)
    return;

  const old =
    [...gameHistory];

  old.pop();

  recomputeFromHistory(old);

  renderHistory();

  updateView();
};


// =========================
// Reset
// =========================

window.resetGame =
function(){

  if(waiting)
    return;

  recomputeFromHistory([]);

  renderHistory();

  showTextOnly(
    '已重置：先套入24手（顺序命中，允许插）→ 门槛PBP三手 → 过门槛才逐手预测。'
  );

  updateView();
};


// ======================================================
// 截图识别
// ======================================================

window.openScreenshot =
function(){

  const input =
    byId('imageInput');

  if(input){

    input.value = '';

    input.click();
  }
};


// =========================
// RGB转HSV
// =========================

function rgbToHSV(r,g,b){

  r /= 255;
  g /= 255;
  b /= 255;

  const max =
    Math.max(r,g,b);

  const min =
    Math.min(r,g,b);

  const d =
    max - min;

  let h = 0;

  if(d !== 0){

    if(max === r){

      h =
        60 *
        (
          ((g-b)/d) % 6
        );

    }else if(max === g){

      h =
        60 *
        (
          (b-r)/d + 2
        );

    }else{

      h =
        60 *
        (
          (r-g)/d + 4
        );
    }
  }

  if(h < 0)
    h += 360;

  const s =
    max === 0
      ? 0
      : d/max;

  return {
    h:h,
    s:s,
    v:max
  };
}


// =========================
// 判断颜色
// =========================

function classifyColor(r,g,b,a){

  if(a < 180)
    return null;

  const hsv =
    rgbToHSV(r,g,b);

  if(
    hsv.s < 0.38 ||
    hsv.v < 0.32
  ){
    return null;
  }


  // 红色 = B

  if(
    hsv.h <= 18 ||
    hsv.h >= 342
  ){
    return 'B';
  }


  // 蓝色 = P

  if(
    hsv.h >= 190 &&
    hsv.h <= 245
  ){
    return 'P';
  }


  // 绿色 = T

  if(
    hsv.h >= 80 &&
    hsv.h <= 165
  ){
    return 'T';
  }

  return null;
}


// =========================
// 连通区域检测
// =========================

function findComponents(
  imageData,
  width,
  height,
  targetType
){

  const data =
    imageData.data;

  const total =
    width * height;

  const mask =
    new Uint8Array(total);

  const visited =
    new Uint8Array(total);

  for(
    let i=0;
    i<total;
    i++
  ){

    const p =
      i * 4;

    const type =
      classifyColor(
        data[p],
        data[p+1],
        data[p+2],
        data[p+3]
      );

    if(type === targetType)
      mask[i] = 1;
  }


  const result = [];
  const stack = [];

  const minArea =
    Math.max(
      12,
      Math.floor(
        total * 0.000025
      )
    );


  for(
    let index=0;
    index<total;
    index++
  ){

    if(
      !mask[index] ||
      visited[index]
    ){
      continue;
    }

    visited[index] = 1;

    stack.length = 0;
    stack.push(index);

    let area = 0;

    let sumX = 0;
    let sumY = 0;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;


    while(stack.length){

      const current =
        stack.pop();

      const y =
        Math.floor(
          current / width
        );

      const x =
        current -
        y * width;

      area++;

      sumX += x;
      sumY += y;

      if(x < minX) minX = x;
      if(x > maxX) maxX = x;
      if(y < minY) minY = y;
      if(y > maxY) maxY = y;

      let n;


      // 左

      if(x > 0){

        n =
          current - 1;

        if(
          mask[n] &&
          !visited[n]
        ){

          visited[n] = 1;
          stack.push(n);
        }
      }


      // 右

      if(x < width-1){

        n =
          current + 1;

        if(
          mask[n] &&
          !visited[n]
        ){

          visited[n] = 1;
          stack.push(n);
        }
      }


      // 上

      if(y > 0){

        n =
          current - width;

        if(
          mask[n] &&
          !visited[n]
        ){

          visited[n] = 1;
          stack.push(n);
        }
      }


      // 下

      if(y < height-1){

        n =
          current + width;

        if(
          mask[n] &&
          !visited[n]
        ){

          visited[n] = 1;
          stack.push(n);
        }
      }
    }


    if(area < minArea)
      continue;


    const bw =
      maxX-minX+1;

    const bh =
      maxY-minY+1;


    if(
      bw < 6 ||
      bh < 6
    ){
      continue;
    }


    const ratio =
      bw / bh;


    if(
      ratio < 0.45 ||
      ratio > 2.2
    ){
      continue;
    }


    const fill =
      area /
      (bw * bh);


    if(fill < 0.12)
      continue;


    result.push({

      type:targetType,

      x:sumX/area,
      y:sumY/area,

      width:bw,
      height:bh,

      area:area
    });
  }

  return result;
}


// ======================================================
// 新增：过滤小红点 / 小蓝点
// ======================================================

function filterNormalBP(
  bankers,
  players
){

  const bp =
    [
      ...bankers,
      ...players
    ];

  if(bp.length < 3){

    return {
      bankers,
      players
    };
  }


  const sizes =
    bp
      .map(
        p =>
          Math.max(
            p.width,
            p.height
          )
      )
      .sort(
        (a,b)=>a-b
      );


  // 不让最小的小红点影响正常圆尺寸
  const start =
    Math.floor(
      sizes.length * 0.35
    );


  const normalSizes =
    sizes.slice(start);


  const normalSize =

    normalSizes[
      Math.floor(
        normalSizes.length / 2
      )
    ]

    ||

    sizes[
      Math.floor(
        sizes.length / 2
      )
    ];


  // 正常庄闲圆尺寸范围
  const minSize =
    normalSize * 0.58;

  const maxSize =
    normalSize * 1.65;


  function valid(p){

    const size =
      Math.max(
        p.width,
        p.height
      );

    const smallSide =
      Math.min(
        p.width,
        p.height
      );


    // 太小：小红点/小蓝点
    if(size < minSize)
      return false;


    // 太大：数字、文字、图标
    if(size > maxSize)
      return false;


    // 太长太扁，不像正常圆
    if(
      smallSide / size < 0.58
    ){
      return false;
    }


    return true;
  }


  return {

    bankers:
      bankers.filter(valid),

    players:
      players.filter(valid)

  };
}


// =========================
// 合并附近碎片
// =========================

function mergeNearby(points){

  if(!points.length)
    return [];


  const sizes =
    points.map(
      p =>
        Math.max(
          p.width || 10,
          p.height || 10
        )
    );


  sizes.sort(
    (a,b)=>a-b
  );


  const median =
    sizes[
      Math.floor(
        sizes.length/2
      )
    ] || 15;


  const maxDistance =
    Math.max(
      5,
      median * 0.55
    );


  const used =
    new Array(
      points.length
    ).fill(false);


  const merged = [];


  for(
    let i=0;
    i<points.length;
    i++
  ){

    if(used[i])
      continue;

    used[i] = true;


    let sx =
      points[i].x *
      points[i].area;

    let sy =
      points[i].y *
      points[i].area;

    let area =
      points[i].area;


    let bestType =
      points[i].type;

    let bestArea =
      points[i].area;


    for(
      let j=i+1;
      j<points.length;
      j++
    ){

      if(used[j])
        continue;


      const dx =
        points[j].x -
        points[i].x;

      const dy =
        points[j].y -
        points[i].y;


      const dist =
        Math.sqrt(
          dx*dx +
          dy*dy
        );


      if(dist <= maxDistance){

        used[j] = true;


        sx +=
          points[j].x *
          points[j].area;


        sy +=
          points[j].y *
          points[j].area;


        area +=
          points[j].area;


        if(
          points[j].area >
          bestArea
        ){

          bestArea =
            points[j].area;

          bestType =
            points[j].type;
        }
      }
    }


    merged.push({

      type:bestType,

      x:sx/area,
      y:sy/area,

      area:area,

      diameter:median
    });
  }


  return merged;
}


// =========================
// 按X坐标分列
// =========================

function clusterColumns(points){

  if(!points.length)
    return [];


  const sorted =
    [...points]
      .sort(
        (a,b)=>a.x-b.x
      );


  let approxSize = 16;


  if(
    points[0] &&
    points[0].diameter
  ){

    approxSize =
      points[0].diameter;
  }


  const tolerance =
    Math.max(
      5,
      approxSize * 0.7
    );


  const columns = [];


  sorted.forEach(point=>{

    let found = null;


    for(
      const column
      of columns
    ){

      if(
        Math.abs(
          point.x -
          column.centerX
        ) <= tolerance
      ){

        found = column;
        break;
      }
    }


    if(!found){

      found = {

        centerX:
          point.x,

        points:[]
      };

      columns.push(found);
    }


    found.points.push(point);


    found.centerX =

      found.points.reduce(
        (sum,p)=>
          sum+p.x,
        0
      )

      /

      found.points.length;
  });


  columns.sort(
    (a,b)=>
      a.centerX-b.centerX
  );


  return columns;
}


// =========================
// 转换成路单顺序
// =========================

function roadToSequence(points){

  if(!points.length)
    return [];


  const columns =
    clusterColumns(points);


  const sequence = [];


  columns.forEach(column=>{

    column.points.sort(
      (a,b)=>a.y-b.y
    );


    // 每列最多6格
    const usable =
      column.points.slice(0,6);


    usable.forEach(point=>{

      sequence.push(
        point.type
      );

    });
  });


  return sequence;
}


// =========================
// 识别截图
// =========================

function recognizeRoad(img){

  const canvas =
    byId('scanCanvas');


  if(!canvas){

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


  const maxWidth = 900;


  let w =
    img.naturalWidth ||
    img.width;


  let h =
    img.naturalHeight ||
    img.height;


  if(w > maxWidth){

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


  let bankers =
    findComponents(
      imageData,
      w,
      h,
      'B'
    );


  let players =
    findComponents(
      imageData,
      w,
      h,
      'P'
    );


  let ties =
    findComponents(
      imageData,
      w,
      h,
      'T'
    );


  // ====================================
  // 关键修复：
  // 先过滤掉庄闲的小红点/小蓝点
  // ====================================

  const filteredBP =
    filterNormalBP(
      bankers,
      players
    );


  bankers =
    filteredBP.bankers;


  players =
    filteredBP.players;


  // T保持原来的识别方式
  // 因为绿色和有时本身就比较小

  let all =
    [
      ...bankers,
      ...players,
      ...ties
    ];


  all =
    mergeNearby(all);


  // ====================================
  // 过滤极端异常面积
  // ====================================

  if(all.length){

    const areas =
      all
        .map(
          x=>x.area
        )
        .sort(
          (a,b)=>a-b
        );


    const medianArea =
      areas[
        Math.floor(
          areas.length/2
        )
      ];


    all =
      all.filter(
        p =>
          p.area >
            medianArea * 0.20

          &&

          p.area <
            medianArea * 5
      );
  }


  const sequence =
    roadToSequence(all);


  return {

    sequence:sequence,

    points:all,

    width:w,

    height:h
  };
}


// =========================
// 导入识别结果
// =========================

function importRecognizedSequence(
  sequence
){

  if(!sequence.length){

    throw new Error(
      '没有识别到庄闲'
    );
  }


  // T不进入预测历史
  const bpSequence =
    sequence.filter(
      x =>
        x === 'B' ||
        x === 'P'
    );


  const tieCount =
    sequence.filter(
      x => x === 'T'
    ).length;


  recomputeFromHistory(
    bpSequence
  );


  renderHistory();

  updateView();


  return {

    bpCount:
      bpSequence.length,

    tieCount:
      tieCount
  };
}


// =========================
// 图片选择
// =========================

function setupImageRecognition(){

  const input =
    byId('imageInput');


  if(!input)
    return;


  input.addEventListener(
    'change',
    function(event){

      const file =
        event.target.files &&
        event.target.files[0];


      if(!file)
        return;


      const statusBox =
        byId('scanStatusBox');


      const status =
        byId('scanStatus');


      if(statusBox){

        statusBox
          .classList
          .remove('hidden');
      }


      if(status){

        status.textContent =
          '正在识别截图，请稍等……';
      }


      setButtonsDisabled(true);


      const img =
        new Image();


      const url =
        URL.createObjectURL(file);


      img.onload =
      function(){

        try{

          const result =
            recognizeRoad(img);


          if(
            !result.sequence.length
          ){

            throw new Error(
              '没有识别到路单，请尽量只截庄/闲/和圆点区域。'
            );
          }


          const imported =
            importRecognizedSequence(
              result.sequence
            );


          const originalText =
            result.sequence.join('');


          if(status){

            status.textContent =

              `✅ 识别完成\n` +

              `识别顺序：${originalText}\n` +

              `已导入庄/闲：${imported.bpCount}手\n` +

              `识别到和：${imported.tieCount}手（和不进入B/P预测）`;
          }


        }catch(err){

          console.error(err);


          if(status){

            status.textContent =

              '❌ 识别失败：' +

              (
                err.message ||
                String(err)
              )

              +

              '\n请尽量只保留路单圆点区域。';
          }

        }finally{

          setButtonsDisabled(false);

          URL.revokeObjectURL(url);
        }
      };


      img.onerror =
      function(){

        if(status){

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


// =========================
// 使用说明
// =========================

window.toggleInstructions =
function(){

  const modal =
    byId('instModal');

  const text =
    byId('instText');


  if(text){

    text.textContent =
`使用方法：

一、手动输入
点击P或B输入开奖结果。

二、截图识别
1. 截取百家乐路单。
2. 建议使用矩形截图，只截大路区域。
3. 点击“📷 截图识别”。
4. 选择截图。
5. 系统自动识别：
   红色 = B
   蓝色 = P
   绿色 = T
6. 每列从上往下读取，一列最多6个。
7. 再读取右边下一列。
8. B/P自动进入预测系统。
9. T会识别，但不会进入B/P预测历史。

本版本已经增加：
小红点、小蓝点过滤，
减少凭空多出B/P的问题。`;
  }


  if(modal){

    modal
      .classList
      .remove('hidden');
  }
};


window.closeInstructions =
function(){

  const modal =
    byId('instModal');

  if(modal){

    modal
      .classList
      .add('hidden');
  }
};


// =========================
// 初始化
// =========================

document.addEventListener(
  'DOMContentLoaded',
  function(){

    renderHistory();

    showTextOnly(
      '就绪：可手动输入B/P，也可以点击“📷 截图识别”直接导入路单。'
    );

    updateView();

    setupImageRecognition();
  }
);

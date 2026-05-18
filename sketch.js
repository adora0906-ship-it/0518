let capture;
let pg; // 用於處理像素的圖層
let handPose;
let hands = [];

// 遊戲變數
let gameState = 'WAITING'; // WAITING, PLAYING, RESULT, FINISHED
let timer = 3;
let lastTimestamp = 0;
let playerChoice = "";
let computerChoice = "";
let resultMessage = "";
let canDetectAction = false;

function preload() {
  // 載入 ml5.js 的 handPose 模型
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide();
  
  // 建立一個與視訊大小相同的圖層
  pg = createGraphics(640, 480);

  // 開始偵測影像中的手部
  handPose.detectStart(capture, gotHands);
}

function gotHands(results) {
  // 儲存偵測結果
  hands = results;
}

function draw() {
  background('#e7c6ff');

  let w = width * 0.6; // 畫面寬度的 60%
  let h = height * 0.6; // 畫面高度的 60%
  let startX = (width - w) / 2;
  let startY = (height - h) / 2;

  // 1. 處理像素邏輯：先將視訊畫到 pg 圖層上
  pg.image(capture, 0, 0);
  pg.loadPixels();

  // 2. 繪製鏡像後的攝影機影像到主畫布中央
  push();
  translate(width / 2, height / 2);
  scale(-1, 1); // 修正攝影機左右顛倒問題
  imageMode(CENTER);
  image(capture, 0, 0, w, h);

  // 繪製手部節點連線
  stroke(0, 255, 0); // 使用綠色線條
  strokeWeight(3);
  
  for (let hand of hands) {
    // 定義連線組：大拇指(0-4), 食指(5-8), 中指(9-12), 無名指(13-16), 小指(17-20)
    let fingerGroups = [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
      [17, 18, 19, 20]
    ];

    for (let group of fingerGroups) {
      for (let i = 0; i < group.length - 1; i++) {
        let p1 = hand.keypoints[group[i]];
        let p2 = hand.keypoints[group[i + 1]];
        // 將 640x480 的原始座標映射到畫布中央置中的視訊區域 (-w/2, -h/2 到 w/2, h/2)
        let x1 = map(p1.x, 0, capture.width, -w / 2, w / 2);
        let y1 = map(p1.y, 0, capture.height, -h / 2, h / 2);
        let x2 = map(p2.x, 0, capture.width, -w / 2, w / 2);
        let y2 = map(p2.y, 0, capture.height, -h / 2, h / 2);
        line(x1, y1, x2, y2);
      }
    }
  }
  pop();

  // 3. 繪製像素數值網格 (20x20 為單位)
  if (pg.pixels.length > 0) {
    textAlign(CENTER, CENTER);
    textSize(Math.floor(w / (pg.width / 20) * 0.5)); // 動態調整文字大小
    fill(0);
    noStroke();

    let step = 20;
    for (let y = 0; y < pg.height; y += step) {
      for (let x = 0; x < pg.width; x += step) {
        let i = (y * pg.width + x) * 4;
        let r = pg.pixels[i];
        let g = pg.pixels[i + 1];
        let b = pg.pixels[i + 2];
        let avg = Math.floor((r + g + b) / 3);
        let screenX = map(x, 0, pg.width, startX + w, startX); 
        let screenY = map(y, 0, pg.height, startY, startY + h);
        text(avg, screenX, screenY);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

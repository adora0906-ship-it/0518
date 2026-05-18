let capture;
let handPose;
let hands = [];

// 遊戲變數
let gameState = 'PLAYING'; // PLAYING, RESULT, FINISHED
let timer = 3;
let lastTimestamp = 0;
let playerChoice = "";
let computerChoice = "";
let resultMessage = "";
let gestureCooldown = 0; // 防止手勢偵測過於靈敏

function preload() {
  // 檢查 ml5 是否正確載入
  if (typeof ml5 !== 'undefined') {
    handPose = ml5.handPose();
  } else {
    console.error("ml5 函式庫未載入，請檢查 HTML 檔案是否包含 ml5.js 的 script 標籤。");
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 加入錯誤回呼，捕捉鏡頭存取失敗的情況
  capture = createCapture(VIDEO, function(stream) {
    console.log("鏡頭啟動成功");
  }, function(err) {
    console.error("鏡頭啟動失敗：", err);
    resultMessage = "找不到攝影機，請檢查權限設定";
  });
  capture.size(640, 480); // 設定基準解析度以利座標計算
  capture.hide(); // 隱藏預設產生的 HTML 影片標籤，改繪製在畫布上

  // 確保 handPose 已初始化才開始偵測
  if (handPose) {
    handPose.detectStart(capture, gotHands);
  }
}

function gotHands(results) {
  // 更新偵測到的手部資料陣列
  hands = results;
}

function draw() {
  background('#e7c6ff');

  // 在畫布中央繪製影像，寬高設定為全螢幕畫面的 50%
  push();
  imageMode(CENTER);
  if (capture) {
    image(capture, width / 2, height / 2, width * 0.5, height * 0.5);
  }
  pop();

  // 處理遊戲邏輯
  handleGameLogic();

  // 繪製手部節點連線
  drawHandConnections();

  // 繪製文字 UI
  drawUI();
}

function handleGameLogic() {
  if (gameState === 'PLAYING') {
    // 每秒倒數一次
    if (millis() - lastTimestamp > 1000) {
      timer--;
      lastTimestamp = millis();
      if (timer <= 0) {
        if (hands.length > 0) {
          playerChoice = detectGesture(hands[0]);
          if (playerChoice === "Rock" || playerChoice === "Paper" || playerChoice === "Scissors") {
            computerChoice = random(["Rock", "Paper", "Scissors"]);
            determineWinner();
            gameState = 'RESULT';
          } else {
            resultMessage = "沒偵測到正確拳法，請重來";
            timer = 3; // 重新倒數
          }
        } else {
          resultMessage = "請把手放到畫面上";
          timer = 3;
        }
      }
    }
  } else if (gameState === 'RESULT') {
    // 偵測繼續或結束的手勢
    if (hands.length > 0 && millis() - lastTimestamp > 1500) { // 給玩家一點緩衝時間
      let action = detectGesture(hands[0]);
      if (action === "Continue") {
        resetGame();
      } else if (action === "End") {
        gameState = 'FINISHED';
      }
    }
  }
}

function detectGesture(hand) {
  // 判斷手指是否伸直 (指尖 Y 座標小於關節 Y 座標)
  let index = hand.keypoints[8].y < hand.keypoints[6].y;
  let middle = hand.keypoints[12].y < hand.keypoints[10].y;
  let ring = hand.keypoints[16].y < hand.keypoints[14].y;
  let pinky = hand.keypoints[20].y < hand.keypoints[18].y;

  // 剪刀石頭布邏輯
  if (index && middle && ring && pinky) return "Paper";
  if (!index && !middle && !ring && !pinky) return "Rock";
  if (index && middle && !ring && !pinky) return "Scissors";
  
  // 繼續或結束邏輯
  if (index && !middle && !ring && !pinky) return "Continue";
  if (pinky && !index && !middle && !ring) return "End";
  
  return "Unknown";
}

function determineWinner() {
  if (playerChoice === computerChoice) {
    resultMessage = "平局！";
  } else if (
    (playerChoice === "Rock" && computerChoice === "Scissors") ||
    (playerChoice === "Paper" && computerChoice === "Rock") ||
    (playerChoice === "Scissors" && computerChoice === "Paper")
  ) {
    resultMessage = "你贏了！";
  } else {
    resultMessage = "你輸了！";
  }
}

function resetGame() {
  gameState = 'PLAYING';
  timer = 3;
  playerChoice = "";
  computerChoice = "";
  resultMessage = "";
  lastTimestamp = millis();
}

function drawUI() {
  textAlign(CENTER, CENTER);
  fill(0);
  noStroke();

  if (gameState === 'PLAYING') {
    textSize(64);
    text(timer, width / 2, height / 2 - 100);
    textSize(24);
    text("準備出拳...", width / 2, height / 2 + 150);
  } else if (gameState === 'RESULT') {
    textSize(40);
    text(`你出: ${playerChoice} vs 電腦: ${computerChoice}`, width / 2, height * 0.2);
    textSize(64);
    fill(resultMessage === "你贏了！" ? 'green' : (resultMessage === "你輸了！" ? 'red' : 'black'));
    text(resultMessage, width / 2, height / 2);
    
    fill(0);
    textSize(20);
    text("伸出【食指】繼續遊玩 | 伸出【小指】結束遊戲", width / 2, height * 0.8);
  } else if (gameState === 'FINISHED') {
    textSize(64);
    text("遊戲結束", width / 2, height / 2);
  }
}

function drawHandConnections() {
  // 繪製手部節點連線
  stroke(0, 0, 255); // 設定線條顏色（藍色）
  strokeWeight(3);   // 設定線條粗細

  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    // 定義連線組：0-4, 5-8, 9-12, 13-16, 17-20
    let fingerGroups = [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];

    for (let group of fingerGroups) {
      for (let j = 0; j < group.length - 1; j++) {
        let p1 = hand.keypoints[group[j]];
        let p2 = hand.keypoints[group[j + 1]];

        // 將原始座標映射到畫布中央 50% 的顯示區域
        let x1 = map(p1.x, 0, capture.width, width * 0.25, width * 0.75);
        let y1 = map(p1.y, 0, capture.height, height * 0.25, height * 0.75);
        let x2 = map(p2.x, 0, capture.width, width * 0.25, width * 0.75);
        let y2 = map(p2.y, 0, capture.height, height * 0.25, height * 0.75);

        line(x1, y1, x2, y2);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

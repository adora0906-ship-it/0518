import cv2
import mediapipe as mp
import random
import time

# 初始化 MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    max_num_hands=1,          # 只偵測一隻手
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)
mp_draw = mp.solutions.drawing_utils

# 開啟視訊鏡頭
cap = cv2.VideoCapture(0)

# 遊戲狀態設定：'COUNTDOWN' (倒數中), 'RESULT' (結算畫面)
game_state = 'COUNTDOWN'
countdown_duration = 3  # 倒數 3 秒
start_time = time.time()

player_gesture = "None"
computer_gesture = "None"
game_result = ""

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        print("無法讀取鏡頭，請檢查相機是否被其他程式佔用。")
        break

    # 左右翻轉畫面（像照鏡子比較直覺），並轉換成 RGB 給 MediaPipe 處理
    frame = cv2.flip(frame, 1)
    h, w, c = frame.shape
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(img_rgb)

    # 預設手指狀態（True = 伸直, False = 彎曲）
    index_open = middle_open = ring_open = pinky_open = False
    hand_detected = False

    if results.multi_hand_landmarks:
        hand_detected = True
        for hand_landmarks in results.multi_hand_landmarks:
            # 畫出手指關節點
            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            # 判斷手指是否伸直（指尖的 y 座標小於關節的 y 座標代表伸直）
            index_open = hand_landmarks.landmark[8].y < hand_landmarks.landmark[6].y
            middle_open = hand_landmarks.landmark[12].y < hand_landmarks.landmark[10].y
            ring_open = hand_landmarks.landmark[16].y < hand_landmarks.landmark[14].y
            pinky_open = hand_landmarks.landmark[20].y < hand_landmarks.landmark[18].y

    # --- 遊戲邏輯處理 ---
    if game_state == 'COUNTDOWN':
        elapsed_time = time.time() - start_time
        remaining_time = countdown_duration - int(elapsed_time)

        # 在畫面上顯示倒數秒數
        if remaining_time > 0:
            cv2.putText(frame, str(remaining_time), (int(w/2)-30, int(h/2)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 255, 255), 5, cv2.LINE_AA)
        else:
            # 倒數結束，判定玩家手勢
            if hand_detected:
                if not index_open and not middle_open and not ring_open and not pinky_open:
                    player_gesture = "Rock"
                elif index_open and middle_open and not ring_open and not pinky_open:
                    player_gesture = "Scissors"
                elif index_open and middle_open and ring_open and pinky_open:
                    player_gesture = "Paper"
                else:
                    player_gesture = "Unknown"  # 無法識別的手勢
            else:
                player_gesture = "No Hand"

            # 電腦隨機出拳
            if player_gesture in ["Rock", "Scissors", "Paper"]:
                computer_gesture = random.choice(["Rock", "Scissors", "Paper"])
                # 勝負邏輯
                if player_gesture == computer_gesture:
                    game_result = "TIE"
                elif (player_gesture == "Rock" and computer_gesture == "Scissors") or \
                     (player_gesture == "Scissors" and computer_gesture == "Paper") or \
                     (player_gesture == "Paper" and computer_gesture == "Rock"):
                    game_result = "YOU WIN!"
                else:
                    game_result = "YOU LOSE!"
            else:
                computer_gesture = "None"
                game_result = "Invalid Round"

            game_state = 'RESULT'

    elif game_state == 'RESULT':
        # 顯示對決結果
        cv2.putText(frame, f"Player: {player_gesture}", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(frame, f"Computer: {computer_gesture}", (50, 130), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # 根據輸贏換顏色
        color = (0, 255, 0) if "WIN" in game_result else (0, 0, 255) if "LOSE" in game_result else (0, 255, 255)
        cv2.putText(frame, game_result, (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 3)

        # 提示操作導引
        cv2.putText(frame, "Show INDEX to Continue", (50, h - 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 192, 203), 2)
        cv2.putText(frame, "Show PINKY to Exit", (50, h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # 偵測特殊控制手勢
        if hand_detected:
            # 食指繼續：只有食指開，其他主要手指收著
            if index_open and not middle_open and not ring_open and not pinky_open:
                game_state = 'COUNTDOWN'
                start_time = time.time()  # 重新計時
            # 小指結束：只有小指開，其他主要手指收著
            elif pinky_open and not index_open and not middle_open and not ring_open:
                print("偵測到小指，遊戲結束！")
                break

    # 顯示視窗
    cv2.imshow('Rock Paper Scissors Game', frame)

    # 萬一用手勢卡住，鍵盤按 'q' 也可以強制離開
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
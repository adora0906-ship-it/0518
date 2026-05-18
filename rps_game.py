import cv2
import mediapipe as mp
import random

# 1. 初始化 MediaPipe 手勢辨識
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

# 2. 自動尋找可以開啟的視訊鏡頭 (嘗試 0 或 1)
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("嘗試鏡頭 0 失敗，切換至鏡頭 1...")
    cap = cv2.VideoCapture(1)

if not cap.isOpened():
    print("【錯誤】找不到任何可用的視訊鏡合，請檢查鏡頭是否插好，或被其他程式（如 Line、Teams）佔用中！")
else:
    print("鏡頭成功開啟！請把手放到鏡頭前，按鍵盤上的 'Space (空白鍵)' 出拳對決！")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # 畫面左右翻轉（像照鏡子）
    frame = cv2.flip(frame, 1)
    h, w, c = frame.shape
    
    # 轉成 RGB 給 MediaPipe 處理
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(img_rgb)

    player_gesture = "Ready..."

    # 3. 偵測手勢
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # 在畫面上畫出藍色骨架線條
            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            # 讀取主要手指的狀態（指尖 y 座標小於關節 y 座標 = 伸直）
            index_open = hand_landmarks.landmark[8].y < hand_landmarks.landmark[6].y
            middle_open = hand_landmarks.landmark[12].y < hand_landmarks.landmark[10].y
            ring_open = hand_landmarks.landmark[16].y < hand_landmarks.landmark[14].y
            pinky_open = hand_landmarks.landmark[20].y < hand_landmarks.landmark[18].y

            # 簡單判定剪刀石頭布
            if not index_open and not middle_open and not ring_open and not pinky_open:
                player_gesture = "Rock (Stone)"
            elif index_open and middle_open and not ring_open and not pinky_open:
                player_gesture = "Scissors"
            elif index_open and middle_open and ring_open and pinky_open:
                player_gesture = "Paper"
            else:
                player_gesture = "Changing..."

    # 4. 在畫面上印出玩家目前的手勢狀態
    cv2.putText(frame, f"Your Hand: {player_gesture}", (30, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
    cv2.putText(frame, "Press 'Space' to Play / Press 'q' to Quit", (30, h - 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    cv2.imshow('RPS Game Simple', frame)

    # 5. 按鍵偵測
    key = cv2.waitKey(1) & 0xFF
    
    # 按下空白鍵 (Space) 進行對決
    if key == ord(' '):
        if player_gesture in ["Rock (Stone)", "Scissors", "Paper"]:
            computer = random.choice(["Rock (Stone)", "Scissors", "Paper"])
            
            # 判斷勝負
            if player_gesture == computer:
                result = "TIE (Draw)"
            elif (player_gesture == "Rock (Stone)" and computer == "Scissors") or \
                 (player_gesture == "Scissors" and computer == "Paper") or \
                 (player_gesture == "Paper" and computer == "Rock (Stone)"):
                result = "YOU WIN!!"
            else:
                result = "YOU LOSE..."
                
            # 直接印在下方終端機，清清楚楚
            print("\n--- 對決結果 ---")
            print(f"你出：{player_gesture}")
            print(f"電腦出：{computer}")
            print(f"結果：{result}")
            print("----------------\n")
        else:
            print("請把手比好剪刀、石頭或布，再按空白鍵喔！")

    # 按下 'q' 鍵離開
    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("程式已關閉。")
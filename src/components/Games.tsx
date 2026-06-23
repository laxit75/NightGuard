import React, { useEffect, useRef, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { GameType } from "../types";
import { styles } from "./Styles";

// ── Math Game ──
export const MathGame: React.FC<{
  onWin: () => void;
  disabled: boolean;
  colors: Record<string, string>;
}> = ({ onWin, disabled, colors }) => {
  const [answer, setAnswer] = useState("");
  const [a] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [b] = useState(() => Math.floor(Math.random() * 20) + 1);
  const check = () => {
    if (parseInt(answer) === a + b) onWin();
    else Alert.alert("Wrong!", "Try again.");
  };
  return (
    <View style={styles.gameContainer}>
      <Text
        style={[
          styles.gameHint,
          { color: colors.text, fontSize: 24, marginBottom: 20 },
        ]}
      >
        What is {a} + {b}?
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            color: colors.text,
            width: 200,
            textAlign: "center",
          },
        ]}
        keyboardType="numeric"
        value={answer}
        onChangeText={setAnswer}
        placeholder="Answer"
        placeholderTextColor={colors.subText}
      />
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: colors.primary, marginTop: 20 },
        ]}
        disabled={disabled}
        onPress={check}
      >
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── YesNo Game ──
export const YesNoGame: React.FC<{
  onWin: () => void;
  disabled: boolean;
  colors: Record<string, string>;
}> = ({ onWin, disabled, colors }) => (
  <View style={styles.gameContainer}>
    <Text
      style={[
        styles.gameHint,
        { color: colors.text, fontSize: 24, marginBottom: 20 },
      ]}
    >
      Is the sky blue?
    </Text>
    <TouchableOpacity
      style={[
        styles.primaryButton,
        { backgroundColor: colors.success, marginBottom: 10 },
      ]}
      disabled={disabled}
      onPress={onWin}
    >
      <Text style={styles.buttonText}>✅ Yes</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.primaryButton, { backgroundColor: colors.danger }]}
      disabled={disabled}
      onPress={() => Alert.alert("Wrong!", "Try again.")}
    >
      <Text style={styles.buttonText}>❌ No</Text>
    </TouchableOpacity>
  </View>
);

// ── Pong Game ──
export const PongGame: React.FC<{
  onWin: () => void;
  disabled: boolean;
  colors: Record<string, string>;
}> = ({ onWin, disabled, colors }) => {
  const [score, setScore] = useState(0);
  const hit = () => {
    const n = score + 1;
    setScore(n);
    if (n >= 3) onWin();
  };
  return (
    <View style={styles.gameContainer}>
      <Text
        style={[
          styles.gameHint,
          { color: colors.text, fontSize: 18, marginBottom: 10 },
        ]}
      >
        🏓 Tap the ball 3 times!
      </Text>
      <View style={[styles.pongArena, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text, fontSize: 48, marginBottom: 20 }}>
          {score}/3
        </Text>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, paddingHorizontal: 40 },
          ]}
          disabled={disabled}
          onPress={hit}
        >
          <Text style={styles.buttonText}>🏓 HIT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Snake Game ──
const CELL_SIZE = 18;
const GRID_SIZE = 14;
const INITIAL_SNAKE = [{ x: 6, y: 7 }];
const INITIAL_DIR = { x: 1, y: 0 };

type Point = { x: number; y: number };

export const SnakeGame: React.FC<{
  onWin: () => void;
  disabled: boolean;
  colors: Record<string, string>;
}> = ({ onWin, disabled, colors }) => {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 3, y: 3 });
  const [dir, setDir] = useState(INITIAL_DIR);
  const dirRef = useRef(INITIAL_DIR);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGameOverRef = useRef(false);
  const [speed, setSpeed] = useState(200);

  const randomFood = () => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  });

  const startGame = () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    setSnake(INITIAL_SNAKE);
    setDir(INITIAL_DIR);
    dirRef.current = INITIAL_DIR;
    setFood(randomFood());
    setSpeed(200);
    isGameOverRef.current = false;
  };

  useEffect(() => {
    startGame();
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }
    gameLoopRef.current = setInterval(() => {
      setSnake((prev) => {
        if (isGameOverRef.current) return prev;
        const head = prev[0];
        const newHead = {
          x: head.x + dirRef.current.x,
          y: head.y + dirRef.current.y,
        };

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          isGameOverRef.current = true;
          startGame();
          return prev;
        }
        // Self collision
        if (
          prev.some((p, i) => i > 0 && p.x === newHead.x && p.y === newHead.y)
        ) {
          isGameOverRef.current = true;
          startGame();
          return prev;
        }

        const ateFood = newHead.x === food.x && newHead.y === food.y;
        const newSnake = [newHead, ...prev];
        if (!ateFood) newSnake.pop();

        if (ateFood) {
          setSpeed((s) => Math.max(80, s - 20));
          if (newSnake.length >= 8) {
            isGameOverRef.current = true;
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            setTimeout(() => onWin(), 100);
          }
          setFood(randomFood());
        }

        return newSnake;
      });
    }, speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [speed, disabled, food.x, food.y]);

  const changeDirection = (dx: number, dy: number) => {
    if (dirRef.current.x + dx === 0 && dirRef.current.y + dy === 0) return;
    dirRef.current = { x: dx, y: dy };
    setDir({ x: dx, y: dy });
  };

  const gridStyle = {
    width: CELL_SIZE * GRID_SIZE,
    height: CELL_SIZE * GRID_SIZE,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    position: "relative" as const,
  };

  return (
    <View style={styles.gameContainer}>
      <Text style={[styles.gameHint, { color: colors.text }]}>
        🐍 Eat food to grow! Reach length 8
      </Text>
      <View style={gridStyle}>
        {snake.map((seg, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: seg.x * CELL_SIZE,
              top: seg.y * CELL_SIZE,
              width: CELL_SIZE - 1,
              height: CELL_SIZE - 1,
              backgroundColor: i === 0 ? colors.primary : colors.success,
              borderRadius: 3,
            }}
          />
        ))}
        <View
          style={{
            position: "absolute",
            left: food.x * CELL_SIZE + 3,
            top: food.y * CELL_SIZE + 3,
            width: CELL_SIZE - 7,
            height: CELL_SIZE - 7,
            backgroundColor: colors.danger,
            borderRadius: 8,
          }}
        />
      </View>
      <View style={{ marginTop: 16, alignItems: "center" }}>
        <TouchableOpacity
          style={[styles.dpadBtn, { backgroundColor: colors.primary }]}
          onPress={() => changeDirection(0, -1)}
          disabled={disabled}
        >
          <Text style={styles.dpadText}>▲</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 12, marginVertical: 4 }}>
          <TouchableOpacity
            style={[styles.dpadBtn, { backgroundColor: colors.primary }]}
            onPress={() => changeDirection(-1, 0)}
            disabled={disabled}
          >
            <Text style={styles.dpadText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dpadBtn, { backgroundColor: colors.primary }]}
            onPress={() => changeDirection(1, 0)}
            disabled={disabled}
          >
            <Text style={styles.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.dpadBtn, { backgroundColor: colors.primary }]}
          onPress={() => changeDirection(0, 1)}
          disabled={disabled}
        >
          <Text style={styles.dpadText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Tap Target Game ──
export const TapTargetGame: React.FC<{
  onWin: () => void;
  disabled: boolean;
  colors: Record<string, string>;
}> = ({ onWin, disabled, colors }) => {
  const [tapCount, setTapCount] = useState(0);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [targetSize, setTargetSize] = useState(70);
  const gameAreaRef = useRef<View>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [gameAreaSize, setGameAreaSize] = useState({ width: 300, height: 300 });

  const moveTarget = () => {
    const maxX = gameAreaSize.width - targetSize;
    const maxY = gameAreaSize.height - targetSize;
    setTargetPos({
      x: Math.random() * maxX,
      y: Math.random() * maxY,
    });
  };

  useEffect(() => {
    if (disabled) {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      return;
    }
    moveTarget();
    moveIntervalRef.current = setInterval(moveTarget, 600);
    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [disabled, targetSize, gameAreaSize]);

  const handleTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    setTargetSize((prev) => Math.max(35, prev - 5));
    if (next >= 5) {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      setTimeout(() => onWin(), 100);
    } else {
      moveTarget();
    }
  };

  return (
    <View style={styles.gameContainer}>
      <Text style={[styles.gameHint, { color: colors.text }]}>
        🎯 Tap the moving target {5 - tapCount} more time
        {5 - tapCount !== 1 ? "s" : ""}
      </Text>
      <View
        ref={gameAreaRef}
        style={{
          width: 300,
          height: 300,
          backgroundColor: colors.inputBg,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
        }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setGameAreaSize({ width, height });
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleTap}
          disabled={disabled}
          style={{
            position: "absolute",
            left: targetPos.x,
            top: targetPos.y,
            width: targetSize,
            height: targetSize,
            borderRadius: targetSize / 2,
            backgroundColor: colors.warning,
            justifyContent: "center",
            alignItems: "center",
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          <Text style={{ fontSize: targetSize / 2, color: "#fff" }}>👆</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const getRandomGame = (): GameType => {
  const games: GameType[] = ["PONG", "MATH", "YESNO", "SNAKE", "TAPTARGET"];
  return games[Math.floor(Math.random() * games.length)];
};

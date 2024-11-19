const CELL_SIZE = 30;
const PLAYER_COLOR = "#34D399";
const WALL_COLOR = "#1F2937";
const PATH_COLOR = "#FFFFFF";
const EXIT_COLOR = "#DC2626";

// 添加动画相关常量
const ANIMATION_DURATION = 200; // 动画持续时间（毫秒）
let isAnimating = false; // 动画状态标志

const DIFFICULTY_LEVELS = {
  easy: { size: 10 },
  medium: { size: 15 },
  hard: { size: 20 },
};

let maze = [];
let player = { x: 1, y: 1 };
let exit = { x: 0, y: 0 };
let currentLevel = 1;
let moves = 0;
let timer = 0;
let timerInterval;
let currentDifficulty = "easy";
let canvas, ctx;
let isGameActive = false;

// 添加玩家实际位置（用于动画）
let playerPos = {
  x: 0,
  y: 0,
  visualX: 0,
  visualY: 0,
};

function initGame() {
  canvas = document.getElementById("mazeCanvas");
  ctx = canvas.getContext("2d");
  addEventListeners();
  startNewGame("easy");
}

function generateMaze(size) {
  // 初始化迷宫数组，全部设置为墙
  maze = Array(size)
    .fill()
    .map(() => Array(size).fill(1));

  // 确保起点和终点位置是通路
  maze[1][1] = 0; // 起点
  maze[size - 2][size - 2] = 0; // 终点

  // 从起点开始生成迷宫
  carve(1, 1);

  // 确保终点可达
  maze[size - 2][size - 2] = 0;
  maze[size - 2][size - 3] = 0; // 确保终点前有路
}

function carve(x, y) {
  const directions = [
    [0, -2], // 上
    [2, 0], // 右
    [0, 2], // 下
    [-2, 0], // 左
  ].sort(() => Math.random() - 0.5);

  for (const [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;

    if (
      newX > 0 &&
      newX < maze[0].length - 1 &&
      newY > 0 &&
      newY < maze.length - 1 &&
      maze[newY][newX] === 1
    ) {
      maze[y + dy / 2][x + dx / 2] = 0;
      maze[newY][newX] = 0;
      carve(newX, newY);
    }
  }
}

async function handleMove(direction) {
  if (!isGameActive || isAnimating) return;

  let newX = player.x;
  let newY = player.y;

  switch (direction) {
    case "↑":
    case "ArrowUp":
      newY--;
      break;
    case "↓":
    case "ArrowDown":
      newY++;
      break;
    case "←":
    case "ArrowLeft":
      newX--;
      break;
    case "→":
    case "ArrowRight":
      newX++;
      break;
  }

  if (isValidMove(newX, newY)) {
    isAnimating = true;

    // 保存新的目标位置
    const targetX = newX * CELL_SIZE;
    const targetY = newY * CELL_SIZE;

    // 更新玩家逻辑位置
    player.x = newX;
    player.y = newY;

    // 更新实际位置
    playerPos.x = targetX;
    playerPos.y = targetY;

    // 执行动画
    await animateMovement(targetX, targetY);

    moves++;
    updateUI();

    // 检查是否到达终点
    if (player.x === exit.x && player.y === exit.y) {
      handleLevelComplete();
    }

    isAnimating = false;
  }
}

function handleKeyPress(e) {
  e.preventDefault(); // 阻止默认行为
  handleMove(e.key);
}

function addEventListeners() {
  // 键盘控制
  document.addEventListener("keydown", handleKeyPress);

  // 触摸控制按钮
  document.querySelectorAll(".control-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const direction = btn.textContent;
      handleMove(direction);
    });
  });
}

function startNewGame(difficulty) {
  currentDifficulty = difficulty;
  const size = DIFFICULTY_LEVELS[difficulty].size;

  // 设置画布大小
  canvas.width = size * CELL_SIZE;
  canvas.height = size * CELL_SIZE;

  // 重置游戏状态
  moves = 0;
  timer = 0;
  isGameActive = true;
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);

  // 生成迷宫
  generateMaze(size);

  // 设置起点和终点（确保在迷宫内部）
  player = { x: 1, y: 1 };
  playerPos = {
    x: 1 * CELL_SIZE,
    y: 1 * CELL_SIZE,
    visualX: 1 * CELL_SIZE,
    visualY: 1 * CELL_SIZE,
  };
  exit = { x: size - 2, y: size - 2 };

  updateUI();
  drawMaze();
}

function handleLevelComplete() {
  isGameActive = false;
  clearInterval(timerInterval);
  document.getElementById("finalTime").textContent = formatTime(timer);
  document.getElementById("finalMoves").textContent = moves;
  document.getElementById("levelComplete").classList.remove("hidden");
}

function isValidMove(x, y) {
  return (
    x > 0 &&
    x < maze[0].length - 1 &&
    y > 0 &&
    y < maze.length - 1 &&
    maze[y][x] === 0
  );
}

// 添加动画函数
function animateMovement(targetX, targetY) {
  return new Promise((resolve) => {
    const startX = playerPos.visualX;
    const startY = playerPos.visualY;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // 使用缓动函数使动画更平滑
      const easeProgress = easeOutQuad(progress);

      // 更新视觉位置
      playerPos.visualX = startX + (targetX - startX) * easeProgress;
      playerPos.visualY = startY + (targetY - startY) * easeProgress;

      // 重绘迷宫
      drawMaze();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 确保最终位置精确
        playerPos.visualX = targetX;
        playerPos.visualY = targetY;
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

// 添加缓动函数
function easeOutQuad(t) {
  return t * (2 - t);
}

function drawMaze() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制迷宫墙壁和路径
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      ctx.fillStyle = maze[y][x] ? WALL_COLOR : PATH_COLOR;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      // 添加网格线
      ctx.strokeStyle = "#E5E7EB";
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  // 绘制终点
  ctx.fillStyle = EXIT_COLOR;
  ctx.fillRect(exit.x * CELL_SIZE, exit.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

  // 绘制玩家（使用动画位置）
  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.arc(
    playerPos.visualX + CELL_SIZE / 2,
    playerPos.visualY + CELL_SIZE / 2,
    CELL_SIZE / 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 添加玩家光晕效果
  const gradient = ctx.createRadialGradient(
    playerPos.visualX + CELL_SIZE / 2,
    playerPos.visualY + CELL_SIZE / 2,
    CELL_SIZE / 4,
    playerPos.visualX + CELL_SIZE / 2,
    playerPos.visualY + CELL_SIZE / 2,
    CELL_SIZE
  );
  gradient.addColorStop(0, "rgba(52, 211, 153, 0.2)");
  gradient.addColorStop(1, "rgba(52, 211, 153, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(
    playerPos.visualX + CELL_SIZE / 2,
    playerPos.visualY + CELL_SIZE / 2,
    CELL_SIZE,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function updateUI() {
  document.getElementById("level").textContent = currentLevel;
  document.getElementById("moves").textContent = moves;
}

function updateTimer() {
  timer++;
  document.getElementById("timer").textContent = formatTime(timer);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function nextLevel() {
  currentLevel++;
  document.getElementById("levelComplete").classList.add("hidden");

  // 根据关卡调整难度
  if (currentLevel % 3 === 0) {
    const difficulties = ["easy", "medium", "hard"];
    const currentIndex = difficulties.indexOf(currentDifficulty);
    if (currentIndex < difficulties.length - 1) {
      currentDifficulty = difficulties[currentIndex + 1];
    }
  }

  startNewGame(currentDifficulty);
}

function closeLevelComplete() {
  document.getElementById("levelComplete").classList.add("hidden");
}

// 初始化游戏
window.onload = initGame;

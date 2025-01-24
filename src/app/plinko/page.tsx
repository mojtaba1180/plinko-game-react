"use client";

import { useRef, useState } from "react";
import { ControlPanel } from "@/components/control-panel";
import { GameBoard, GameBoardHandle } from "@/components/game-board";
import { GameState } from "@/types/game";

export default function Plinko() {
  const [gameState, setGameState] = useState<GameState>({
    mode: "manual",
    betAmount: 1,
    risk: "low",
    rows: 8, // از 8 شروع می‌کنیم
    isRunning: false,
    balance: 98.7,
    sound: true,
  });

  // ریفرنسی که به GameBoard بدهیم تا dropBall قابل دسترسی باشد
  const gameBoardRef = useRef<GameBoardHandle>(null);

  // وقتی توپ با zone ضریب برخورد کند
  const handleBallEnd = (multiplier: number) => {
    const winAmount = gameState.betAmount * multiplier;
    setGameState((prev) => ({
      ...prev,
      balance: prev.balance - prev.betAmount + winAmount,
      isRunning: false,
    }));

    if (gameState.sound) {
      const audio = new Audio("/drop-sound.mp3");
      audio.play();
    }
  };

  // وقتی در کنترل پنل "Send ball" را می‌زنیم
  const handleSendBall = () => {
    if (gameState.balance < gameState.betAmount) return;
    setGameState((prev) => ({ ...prev, isRunning: true }));
    gameBoardRef.current?.dropBall();
  };

  // متدی برای آپدیت بخشی از gameState
  const updateGameState = (updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className='min-h-screen bg-[#13141a] text-white p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* بالای صفحه */}
        <header className='flex justify-between items-center mb-8'>
          <div className='flex items-center gap-4 text-2xl'>
            <span>$</span>
            <span className='font-mono'>{gameState.balance.toFixed(2)}</span>
          </div>
          <div className='flex gap-4'>
            <button className='px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors'>
              DEPOSIT
            </button>
            <button className='px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors'>
              WITHDRAW
            </button>
          </div>
        </header>

        {/* بدنه: کنترل پنل و برد */}
        <div className='flex gap-8'>
          <ControlPanel
            gameState={gameState}
            onUpdateGameState={updateGameState}
            onSendBall={handleSendBall}
          />
          <div className='flex-1'>
            <GameBoard
              ref={gameBoardRef}
              risk={gameState.risk}
              rows={gameState.rows}
              onBallEnd={handleBallEnd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

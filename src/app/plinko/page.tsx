"use client";

import { useRef, useState, useEffect } from "react";
import { ControlPanel } from "@/components/control-panel";
import { GameBoard, type GameBoardHandle } from "@/components/game-board";
import type { GameState } from "@/types/game";

export default function Plinko() {
  const [gameState, setGameState] = useState<GameState>({
    mode: "manual",
    betAmount: 1,
    risk: "low",
    rows: 8,
    isRunning: false,
    balance: 98.7,
    sound: true,
  });

  const gameBoardRef = useRef<GameBoardHandle>(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // console.log(isMobile, "mobile");
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

  const handleSendBall = () => {
    if (gameState.balance < gameState.betAmount) return;
    setGameState((prev) => ({ ...prev, isRunning: true }));
    gameBoardRef.current?.dropBall();
  };

  const updateGameState = (updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className='min-h-screen bg-[#13141a] text-white'>
      <div className='max-w-6xl mx-auto p-4 md:p-8 flex flex-col h-screen'>
        {/* Header */}
        <header className='flex flex-col md:flex-row justify-between items-center gap-4 mb-4'>
          <div className='flex items-center gap-4 text-2xl order-1 md:order-none'>
            <span>$</span>
            <span className='font-mono'>{gameState.balance.toFixed(2)}</span>
          </div>
          <div className='flex gap-2 w-full md:w-auto order-2 md:order-none'>
            <button className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors text-sm md:text-base'>
              DEPOSIT
            </button>
            <button className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors text-sm md:text-base'>
              WITHDRAW
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className='flex flex-col md:flex-row gap-4 flex-grow overflow-hidden'>
          <div className='flex-none w-full md:w-72 order-2 md:order-1'>
            <ControlPanel
              gameState={gameState}
              onUpdateGameState={updateGameState}
              onSendBall={handleSendBall}
            />
          </div>
          <div className='flex-grow order-1 md:order-2 h-[calc(100vh-200px)] md:h-auto'>
            <GameBoard
              ref={gameBoardRef}
              risk={gameState.risk}
              rows={gameState.rows}
              onBallEnd={handleBallEnd}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { ControlPanel } from "@/components/control-panel";
import { GameBoard, type GameBoardHandle } from "@/components/game-board";
import type { GameState } from "@/types/game";

export default function Plinko() {
  const [gameState, setGameState] = useState<GameState>({
    mode: "manual",
    betAmount: 1,
    risk: "low",
    rows: 16,
    isRunning: false,
    balance: 98.7,
    sound: true,
  });

  const gameBoardRef = useRef<GameBoardHandle>(null);
  // const [isMobile, setIsMobile] = useState<boolean | null>(null); // Start as null to indicate uninitialized

  // useEffect(() => {
  //   const checkMobile = () => {
  //     setIsMobile(window.innerWidth < 768); // Determine if the device is mobile
  //   };

  //   checkMobile(); // Initial check
  //   window.addEventListener("resize", checkMobile); // Listen for window resize

  //   return () => window.removeEventListener("resize", checkMobile); // Cleanup
  // }, []);

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

  // if (isMobile === null) {
  //   // Show loading state while determining mobile/desktop
  //   return (
  //     <div className='min-h-screen bg-[#13141a] text-white flex items-center justify-center'>
  //       <span>Loading...</span>
  //     </div>
  //   );
  // }

  return (
    <div className='min-h-screen bg-[#13141a] text-white'>
      <div className='max-w-6xl mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-60px)]'>
        {/* Header */}
        <header className='flex flex-col md:flex-row justify-between items-center gap-4 mb-4'>
          <div className='flex items-center gap-4 text-2xl order-1 md:order-none'>
            <span>$</span>
            <span className='font-mono'>{gameState.balance.toFixed(2)}</span>
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
            {/* Render GameBoard only after isMobile is determined */}
            <GameBoard
              ref={gameBoardRef}
              risk={gameState.risk}
              rows={gameState.rows}
              onBallEnd={handleBallEnd}
              isMobile={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

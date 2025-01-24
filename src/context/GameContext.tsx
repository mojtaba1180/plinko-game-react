"use client";

import React, { createContext, useContext, useState } from "react";

export type RiskLevel = "low" | "medium" | "high";

export interface GameState {
  mode: "manual" | "auto";
  betAmount: number;
  risk: RiskLevel;
  rows: number;
  isRunning: boolean;
  balance: number;
  sound: boolean;
}

interface GameContextType {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState>) => void;
}

const defaultState: GameState = {
  mode: "manual",
  betAmount: 1,
  risk: "low",
  rows: 8,
  isRunning: false,
  balance: 100,
  sound: true,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>(defaultState);

  const updateGameState = (updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <GameContext.Provider value={{ gameState, updateGameState }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGameContext must be used within GameProvider");
  return context;
};

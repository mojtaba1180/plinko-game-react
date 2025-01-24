"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Volume2, VolumeX } from "lucide-react";
// import type { GameState } from "@/types/game";
import { PLINKO_CONFIG } from "@/config/game";
import type { RiskLevel } from "@/types/game";
import { useGameContext } from "@/context/GameContext";

interface ControlPanelProps {
  // onUpdateGameState: (updates: Partial<GameState>) => void;
  onSendBall: () => void;
}

export function ControlPanel({
  // onUpdateGameState,
  onSendBall,
}: ControlPanelProps) {
  const { gameState, updateGameState } = useGameContext();

  const availableRisks = Object.keys(PLINKO_CONFIG) as RiskLevel[];
  const availableRows = Object.keys(PLINKO_CONFIG[gameState.risk]).map(Number);

  const handleBetChange = (value: string) => {
    const bet = Number.parseFloat(value);
    if (!isNaN(bet) && bet > 0) {
      updateGameState({ betAmount: bet });
    }
  };

  return (
    <div className='w-full md:w-72 p-4 md:p-6 bg-[#1a1b23] rounded-lg space-y-4 md:space-y-6 border border-gray-800 overflow-y-auto max-h-[300px] md:max-h-none'>
      {/* Manual/Auto */}
      <div className='flex gap-2'>
        <Button
          variant={gameState.mode === "manual" ? "default" : "secondary"}
          onClick={() => updateGameState({ mode: "manual" })}
          className='flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm md:text-base py-3 h-auto'>
          Manual
        </Button>
        <Button
          variant={gameState.mode === "auto" ? "default" : "secondary"}
          onClick={() => updateGameState({ mode: "auto" })}
          className='flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm md:text-base py-3 h-auto'>
          Auto
        </Button>
      </div>

      {/* Bet amount */}
      <div className='space-y-2'>
        <label className='text-sm text-gray-300'>Bet amount</label>
        <div className='flex gap-2'>
          <Input
            type='number'
            value={gameState.betAmount}
            onChange={(e) => handleBetChange(e.target.value)}
            className='flex-1 bg-gray-800 text-white border-gray-700 h-10 md:h-9'
          />
          <Button
            variant='default'
            onClick={() => handleBetChange(String(gameState.betAmount / 2))}
            className='text-white border-gray-700 hover:bg-gray-700 px-2 h-10 md:h-9 text-sm'>
            x1/2
          </Button>
          <Button
            variant='default'
            onClick={() => handleBetChange(String(gameState.betAmount * 2))}
            className='text-white border-gray-700 hover:bg-gray-700 px-2 h-10 md:h-9 text-sm'>
            x2
          </Button>
        </div>
      </div>

      {/* Risk Select */}
      <div className='space-y-2'>
        <label className='text-sm text-gray-300'>Risk</label>
        <Select
          value={gameState.risk}
          onValueChange={(value: RiskLevel) =>
            updateGameState({ risk: value })
          }>
          <SelectTrigger className='bg-gray-800 text-white border-gray-700 h-10 md:h-9'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='bg-gray-800 text-white border-gray-700'>
            {availableRisks.map((riskKey) => (
              <SelectItem key={riskKey} value={riskKey}>
                {riskKey.charAt(0).toUpperCase() + riskKey.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rows Select */}
      <div className='space-y-2'>
        <label className='text-sm text-gray-300'>Rows</label>
        <Select
          value={gameState.rows.toString()}
          onValueChange={(value) => {
            updateGameState({ rows: Number.parseInt(value, 10) });
          }}>
          <SelectTrigger className='bg-gray-800 text-white border-gray-700 h-10 md:h-9'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='bg-gray-800 text-white border-gray-700'>
            {availableRows.map((r) => (
              <SelectItem key={r} value={r.toString()}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Send ball */}
      <Button
        className='w-full sticky bottom-2 bg-purple-600 hover:bg-purple-700 text-white py-3 h-auto text-base'
        onClick={onSendBall}>
        Send ball
      </Button>

      {/* Sound switch */}
      <div className='flex items-center justify-between text-white'>
        <div className='flex items-center gap-2'>
          {gameState.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </div>
        <Switch
          checked={gameState.sound}
          onCheckedChange={(checked) => updateGameState({ sound: checked })}
        />
      </div>
    </div>
  );
}

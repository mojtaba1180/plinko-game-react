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
import { GameState } from "@/types/game";
import { PLINKO_CONFIG } from "@/config/game"; // Import your config
import { RiskLevel } from "@/types/game";

interface ControlPanelProps {
  gameState: GameState;
  onUpdateGameState: (updates: Partial<GameState>) => void;
  onSendBall: () => void;
}

export function ControlPanel({
  gameState,
  onUpdateGameState,
  onSendBall,
}: ControlPanelProps) {
  // Convert PLINKO_CONFIG's top-level keys to an array of RiskLevel
  const availableRisks = Object.keys(PLINKO_CONFIG) as RiskLevel[];

  // Based on the current selected risk, get the possible row values
  const availableRows = Object.keys(PLINKO_CONFIG[gameState.risk]).map(Number);

  const handleBetChange = (value: string) => {
    const bet = parseFloat(value);
    if (!isNaN(bet) && bet > 0) {
      onUpdateGameState({ betAmount: bet });
    }
  };

  return (
    <div className='w-72 p-6 bg-[#1a1b23] rounded-lg space-y-6 border border-gray-800'>
      {/* Manual/Auto */}
      <div className='flex gap-2'>
        <Button
          variant={gameState.mode === "manual" ? "default" : "secondary"}
          onClick={() => onUpdateGameState({ mode: "manual" })}
          className='flex-1 bg-purple-600 hover:bg-purple-700 text-white'>
          Manual
        </Button>
        <Button
          variant={gameState.mode === "auto" ? "default" : "secondary"}
          onClick={() => onUpdateGameState({ mode: "auto" })}
          className='flex-1 bg-gray-700 hover:bg-gray-600 text-white'>
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
            className='flex-1 bg-gray-800 text-white border-gray-700'
          />
          <Button
            variant='default'
            onClick={() => handleBetChange(String(gameState.betAmount / 2))}
            className='text-white border-gray-700 hover:bg-gray-700'>
            x1/2
          </Button>
          <Button
            variant='default'
            onClick={() => handleBetChange(String(gameState.betAmount * 2))}
            className='text-white border-gray-700 hover:bg-gray-700'>
            x2
          </Button>
        </div>
      </div>

      {/* Risk Select from config */}
      <div className='space-y-2'>
        <label className='text-sm text-gray-300'>Risk</label>
        <Select
          value={gameState.risk}
          onValueChange={(value: RiskLevel) =>
            onUpdateGameState({ risk: value })
          }>
          <SelectTrigger className='bg-gray-800 text-white border-gray-700'>
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

      {/* Rows Select from config */}
      <div className='space-y-2'>
        <label className='text-sm text-gray-300'>Rows</label>
        <Select
          value={gameState.rows.toString()}
          onValueChange={(value) => {
            onUpdateGameState({ rows: parseInt(value, 10) });
          }}>
          <SelectTrigger className='bg-gray-800 text-white border-gray-700'>
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
        className='w-full bg-purple-600 hover:bg-purple-700 text-white'
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
          onCheckedChange={(checked) => onUpdateGameState({ sound: checked })}
        />
      </div>
    </div>
  );
}

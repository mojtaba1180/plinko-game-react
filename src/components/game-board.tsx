"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import Matter from "matter-js";

import type { RiskLevel } from "@/types/game";
import { CANVAS_HEIGHT, CANVAS_WIDTH, PLINKO_CONFIG } from "@/config/game";
import { useGameContext } from "@/context/GameContext";

// Expose dropBall() to parent
export interface GameBoardHandle {
  dropBall: () => void;
}

interface GameBoardProps {
  risk: RiskLevel;
  rows: number;
  onBallEnd: (multiplier: number) => void; // Not strictly needed if we do logic here
  isMobile: boolean;
}

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(
  function GameBoard({ risk, rows, onBallEnd, isMobile }, ref) {
    // Get game context
    const { gameState, updateGameState } = useGameContext();
    // gameState has: mode, betAmount, risk, rows, isRunning, balance, sound
    // updateGameState({ ... })

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    // A helper to build a mirrored multiplier array
    const createMirroredMultipliers = (
      multipliers: { value: number; color?: string }[],
    ) => {
      // Example: if multipliers = [0.5, 1, 2],
      // mirrored => [2, 1, 0.5, 1, 2]
      const mirrored = [...multipliers];
      const reversed = [...multipliers].reverse();
      reversed.pop(); // remove last item to avoid duplicating center
      return [...reversed, ...mirrored];
    };

    // A helper to compute ball radius based on rows
    function getBallRadius(rows: number) {
      const minRows = 8;
      const maxRows = 20;
      const minRadius = 4;
      const maxRadius = 10;

      const clamped = Math.min(Math.max(rows, minRows), maxRows);
      const t = (clamped - minRows) / (maxRows - minRows);
      return maxRadius - t * (maxRadius - minRadius);
    }

    // 1) Create engine, runner, render once
    useEffect(() => {
      if (!engineRef.current) {
        const canvasWidth = isMobile ? CANVAS_WIDTH - 340 : CANVAS_WIDTH;
        const canvasHeight = isMobile
          ? CANVAS_HEIGHT - 120
          : CANVAS_HEIGHT + 120;

        const engine = Matter.Engine.create({
          gravity: { x: 0, y: 1, scale: 0.001 },
        });
        engineRef.current = engine;

        const render = Matter.Render.create({
          canvas: canvasRef.current as HTMLCanvasElement,
          engine,
          options: {
            width: canvasWidth,
            height: canvasHeight,
            wireframes: false,
            background: "#13141a",
          },
        });
        renderRef.current = render;

        const runner = Matter.Runner.create();
        runnerRef.current = runner;

        Matter.Runner.run(runner, engine);
        Matter.Render.run(render);
      }

      return () => {
        if (engineRef.current) Matter.Engine.clear(engineRef.current);
        if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
        if (renderRef.current) {
          Matter.Render.stop(renderRef.current);
          if (renderRef.current.canvas) {
            renderRef.current.canvas.remove();
          }
          renderRef.current.textures = {};
        }
      };
    }, []);

    // 2) Build the scene whenever risk/rows/isMobile changes
    useEffect(() => {
      const engine = engineRef.current;
      const render = renderRef.current;
      if (!engine || !render) return;

      Matter.World.clear(engine.world, false);

      // Basic dimensions
      const canvasWidth = CANVAS_WIDTH;
      const padding = isMobile ? 20 : 40;
      const boardWidth = canvasWidth - padding * 2;
      const pegGap = boardWidth / (rows + 2);
      const pegRadius = 4;
      const multiplierHeight = isMobile ? 30 : 50;
      const totalRows = rows;
      const boardHeight = (totalRows + 1) * pegGap + multiplierHeight;
      const startY = -40;

      // Walls
      const wallThickness = 0;
      const wallHeight = Math.max(CANVAS_HEIGHT, boardHeight + 10);
      const wallY = wallHeight / 2;

      const walls = [
        // left
        Matter.Bodies.rectangle(
          -wallThickness / 2,
          wallY,
          wallThickness,
          wallHeight,
          { isStatic: true },
        ),
        // right
        Matter.Bodies.rectangle(
          CANVAS_WIDTH + wallThickness / 2,
          wallY,
          wallThickness,
          wallHeight,
          { isStatic: true },
        ),
        // bottom
        Matter.Bodies.rectangle(
          CANVAS_WIDTH / 2,
          wallHeight,
          CANVAS_WIDTH + wallThickness * 2,
          wallThickness,
          { isStatic: true },
        ),
      ];

      // Pegs
      const pegs: Matter.Body[] = [];
      for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
        const pegsInRow = rowIndex + 3;
        const rowWidth = (pegsInRow - 1) * pegGap;
        const startX = (canvasWidth - rowWidth) / 2;

        for (let col = 0; col < pegsInRow; col++) {
          const px = startX + col * pegGap;
          const py = startY + rowIndex * pegGap;
          const peg = Matter.Bodies.circle(px, py, pegRadius, {
            isStatic: true,
            render: { fillStyle: "#ffffff" },
            friction: 0.2,
            restitution: 0.1,
          });
          pegs.push(peg);
        }
      }

      // Multiplier zones
      const baseMultipliers = PLINKO_CONFIG[risk][rows] || [];
      const multipliers = createMirroredMultipliers(baseMultipliers);
      const zoneWidth = boardWidth / multipliers.length;
      const lastPegY = startY + (totalRows - 1) * pegGap;
      const zoneY = lastPegY + pegGap / 2 + multiplierHeight / 2;

      const zones = multipliers.map((mult, i) => {
        const zone = Matter.Bodies.rectangle(
          padding + i * zoneWidth + zoneWidth / 2,
          zoneY,
          zoneWidth - 4,
          multiplierHeight,
          {
            isStatic: true,
            isSensor: true,
            label: `multiplier-${mult.value}`,
            render: {
              fillStyle: mult.color || "#f59e0b",
            },
          },
        );
        return zone;
      });

      Matter.World.add(engine.world, [...walls, ...pegs, ...zones]);

      // Draw text in afterRender
      const handleAfterRender = () => {
        const ctx = render.context;
        const { bounds, options } = render;
        const width = options.width ?? 0;
        const height = options.height ?? 0;

        ctx.save();

        // camera transform
        const scaleX = width / (bounds.max.x - bounds.min.x);
        const scaleY = height / (bounds.max.y - bounds.min.y);

        ctx.scale(scaleX, scaleY);
        ctx.translate(-bounds.min.x, -bounds.min.y);

        // draw text on each zone center
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "white";

        zones.forEach((zone) => {
          const val = parseFloat(zone.label.split("-")[1]);
          const text = val + "x";
          ctx.fillText(text, zone.position.x, zone.position.y);
        });

        ctx.restore();
      };
      Matter.Events.on(render, "afterRender", handleAfterRender);

      // Zoom
      const scaleFactor = Math.min(
        CANVAS_HEIGHT / (boardHeight + padding * 2),
        1,
      );
      const viewportHeight = CANVAS_HEIGHT / scaleFactor;
      const viewportY = (viewportHeight - CANVAS_HEIGHT) / 2;

      Matter.Render.lookAt(render, {
        min: { x: -wallThickness, y: -viewportY },
        max: { x: canvasWidth + wallThickness, y: wallHeight + viewportY },
      });

      return () => {
        Matter.Events.off(render, "afterRender", handleAfterRender);
      };
    }, [risk, rows, isMobile]);

    // 3) dropBall
    const dropBall = () => {
      if (!engineRef.current) return;
      const engine = engineRef.current;

      // اگر بازی در حال اجراست یا موجودی کافی نیست، برنگرد
      if (gameState.isRunning) {
        // می‌توانید پیام بدهید "توپ در حال اجراست..."
        return;
      }
      if (gameState.balance < gameState.betAmount) {
        // پیام "موجودی کافی نیست"
        return;
      }

      // کسر مبلغ از موجودی و set isRunning = true
      updateGameState({
        balance: gameState.balance - gameState.betAmount,
        isRunning: true,
      });

      // ساخت توپ
      const radius = getBallRadius(rows);
      const xRand = (Math.random() - 0.5) * 20;

      const ball = Matter.Bodies.circle(CANVAS_WIDTH / 2 + xRand, -70, radius, {
        restitution: 0.7,
        friction: 4,
        frictionAir: 0.02,
        density: 0.1,
        render: { fillStyle: "#ff4500" },
      });

      Matter.Body.setVelocity(ball, { x: 0, y: 2 });
      Matter.World.add(engine.world, ball);

      const handleCollision = (evt: Matter.IEventCollision<Matter.Engine>) => {
        evt.pairs.forEach((pair) => {
          const bodies = [pair.bodyA, pair.bodyB];
          const zone = bodies.find((b) => b.label?.startsWith("multiplier-"));
          if (zone && bodies.includes(ball)) {
            const multiplier = Number.parseFloat(zone.label.split("-")[1]);

            // محاسبه سود:
            const profit = gameState.betAmount * multiplier;
            const newBalance = gameState.balance + profit;

            setTimeout(() => {
              // آپدیت موجودی و set isRunning=false
              updateGameState({
                balance: newBalance,
                isRunning: false,
              });

              // حذف توپ
              Matter.World.remove(engine.world, ball);

              // همچنین اگر لازم است onBallEnd را صدا بزنید
              onBallEnd(multiplier);
            }, 10);

            // حذف collision listener
            Matter.Events.off(engine, "collisionStart", handleCollision);
          }
        });
      };
      Matter.Events.on(engine, "collisionStart", handleCollision);
    };

    // expose dropBall
    useImperativeHandle(ref, () => ({ dropBall }));

    return (
      <div className='relative bg-[#13141a] rounded-lg overflow-hidden w-full'>
        <canvas ref={canvasRef} className='w-full' />
      </div>
    );
  },
);

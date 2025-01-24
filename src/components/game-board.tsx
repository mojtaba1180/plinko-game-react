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

export interface GameBoardHandle {
  dropBall: () => void;
}

interface GameBoardProps {
  risk: RiskLevel;
  rows: number;
  onBallEnd: (multiplier: number) => void;
  isMobile: boolean;
}

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(
  function GameBoard({ risk, rows, onBallEnd, isMobile }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    // const activeZoneRef = useRef<Matter.Body | null>(null);

    // Mirror multipliers, e.g. [0.5, 1, 2] => [2, 1, 0.5, 1, 2]
    const createMirroredMultipliers = (multipliers: any[]) => {
      const mirrored = [...multipliers];
      const reversed = [...multipliers].reverse();
      reversed.pop();
      return [...reversed, ...mirrored];
    };

    // A simple helper to compute ball radius based on rows.
    // For example, fewer rows => bigger ball, more rows => smaller ball.
    function getBallRadius(rows: number) {
      // You can adjust minRows/maxRows or minRadius/maxRadius to your taste
      const minRows = 8;
      const maxRows = 20;
      const minRadius = 5;
      const maxRadius = 12;

      // Clamp rows to [minRows, maxRows]
      const clamped = Math.min(Math.max(rows, minRows), maxRows);
      // Linear interpolation
      const t = (clamped - minRows) / (maxRows - minRows);
      const radius = maxRadius - t * (maxRadius - minRadius);
      // So for rows=8 => radius=12, rows=20 => radius=5
      return radius;
    }

    useEffect(() => {
      if (!engineRef.current) {
        // Adjust canvas size for mobile
        const canvasWidth = isMobile ? CANVAS_WIDTH - 200 : CANVAS_WIDTH; // 32px for padding
        const canvasHeight = isMobile
          ? Math.min(window.innerHeight * 2, CANVAS_HEIGHT)
          : CANVAS_HEIGHT;

        const engine = Matter.Engine.create({
          // Gravity scale
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

    useEffect(() => {
      if (!engineRef.current || !renderRef.current) return;
      const engine = engineRef.current;
      const render = renderRef.current;

      Matter.World.clear(engine.world, false);

      // Adjust dimensions for mobile
      const canvasWidth = CANVAS_WIDTH;
      const padding = isMobile ? 20 : 40;
      const boardWidth = canvasWidth - padding * 2;
      const pegGap = boardWidth / (rows + 2);
      const pegRadius = isMobile ? 3 : 4;
      const multiplierHeight = isMobile ? 40 : 50;

      const totalRows = rows;
      const boardHeight = (totalRows + 1) * pegGap + multiplierHeight;
      const startY = 60;

      // Walls
      const wallThickness = 40;
      const wallHeight = Math.max(CANVAS_HEIGHT, boardHeight + 200);
      const wallY = wallHeight / 2;

      const walls = [
        Matter.Bodies.rectangle(
          -wallThickness / 2,
          wallY,
          wallThickness,
          wallHeight,
          {
            isStatic: true,
            render: { fillStyle: "#2a2b33" },
          },
        ),
        Matter.Bodies.rectangle(
          CANVAS_WIDTH + wallThickness / 2,
          wallY,
          wallThickness,
          wallHeight,
          {
            isStatic: true,
            render: { fillStyle: "#2a2b33" },
          },
        ),
        Matter.Bodies.rectangle(
          CANVAS_WIDTH / 2,
          wallHeight,
          CANVAS_WIDTH + wallThickness * 2,
          wallThickness,
          {
            isStatic: true,
            render: { fillStyle: "#2a2b33" },
          },
        ),
      ];

      // Pegs
      const pegs: Matter.Body[] = [];
      for (let row = 0; row < totalRows; row++) {
        const pegsInRow = row + 3;
        const rowWidth = (pegsInRow - 1) * pegGap;
        const startX = (canvasWidth - rowWidth) / 2;

        for (let col = 0; col < pegsInRow; col++) {
          const px = startX + col * pegGap;
          const py = startY + row * pegGap;
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
              fillStyle: "#f59e0b", // default color, can override if you want
            },
          },
        );
        // If your config has different color for each multiplier:
        if (mult.color) {
          zone.render.fillStyle = mult.color;
        }
        return zone;
      });

      Matter.World.add(engine.world, [...walls, ...pegs, ...zones]);

      const handleAfterRender = () => {
        const ctx = render.context;
        const { bounds, options } = render;
        const width = options.width; // ابعاد بوم
        const height = options.height;

        ctx.save();

        // 1) محاسبهٔ scaleX و scaleY
        const scaleX = width / (bounds.max.x - bounds.min.x);
        const scaleY = height / (bounds.max.y - bounds.min.y);

        // 2) اعمال Scale و Translate مطابق دوربین
        ctx.scale(scaleX, scaleY);
        ctx.translate(-bounds.min.x, -bounds.min.y);

        // 3) حالا با مختصات Matter، متن را می‌کشیم
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 16px Arial"; // بسته به سلیقه و mobile/desktop

        zones.forEach((zone) => {
          const val = parseFloat(zone.label.split("-")[1]);
          const text = val + "x";

          // مرکز Zone همان zone.position.x, zone.position.y
          // اگر می‌خواهید کمی بالاتر یا پایین‌تر باشد، چند پیکسل اضافه/کم کنید
          ctx.fillStyle = "white";
          ctx.fillText(text, zone.position.x, zone.position.y);
        });

        ctx.restore();
      };
      Matter.Events.on(render, "afterRender", handleAfterRender);

      // Zoom logic (simple scaleFactor)
      const scaleFactor = Math.min(
        CANVAS_HEIGHT / (boardHeight + padding * 2),
        1,
      );
      const viewportHeight = CANVAS_HEIGHT / scaleFactor;
      const viewportY = (viewportHeight - CANVAS_HEIGHT) / 2;

      // Adjust the camera
      Matter.Render.lookAt(render, {
        min: { x: -wallThickness, y: -viewportY },
        max: { x: canvasWidth + wallThickness, y: wallHeight + viewportY },
      });

      return () => {
        Matter.Events.off(render, "afterRender", handleAfterRender);
      };
    }, [risk, rows, isMobile]);

    const dropBall = () => {
      if (!engineRef.current) return;
      const engine = engineRef.current;

      // We compute ball radius based on rows
      const radius = isMobile ? getBallRadius(rows) * 0.8 : getBallRadius(rows);

      // Random horizontal offset
      const xRand = (Math.random() - 0.5) * 60;

      const ball = Matter.Bodies.circle(CANVAS_WIDTH / 2 + xRand, 0, radius, {
        // Less bounce => more friction => "falling on a mattress"
        restitution: 0.7, // lower restitution => less bouncy
        friction: 4, // more friction => slower rolling
        frictionAir: 0.033, // bigger frictionAir => it won't move left/right too fast
        density: 0.1, // can adjust density
        render: { fillStyle: "#f00" },
      });

      // Give it a slight downward velocity
      Matter.Body.setVelocity(ball, { x: 0, y: 2 });

      Matter.World.add(engine.world, ball);

      const handleCollision = (evt: Matter.IEventCollision<Matter.Engine>) => {
        evt.pairs.forEach((pair) => {
          const bodies = [pair.bodyA, pair.bodyB];
          const zone = bodies.find((b) => b.label?.startsWith("multiplier-"));
          if (zone && bodies.includes(ball)) {
            const val = Number.parseFloat(zone.label.split("-")[1]);
            setTimeout(() => {
              onBallEnd(val);
              Matter.World.remove(engine.world, ball);
            }, 10);
            Matter.Events.off(engine, "collisionStart", handleCollision);
          }
        });
      };

      Matter.Events.on(engine, "collisionStart", handleCollision);
    };

    useImperativeHandle(ref, () => ({ dropBall }));

    return (
      <div className='relative bg-[#13141a] rounded-lg overflow-hidden w-full'>
        <canvas ref={canvasRef} className='w-full' />
      </div>
    );
  },
);

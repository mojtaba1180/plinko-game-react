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
    const createMirroredMultipliers = (
      multipliers: { value: number; color?: string }[],
    ) => {
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
      const minRadius = 4;
      const maxRadius = 10;

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
        const canvasWidth = isMobile ? CANVAS_WIDTH - 340 : CANVAS_WIDTH;
        const canvasHeight = isMobile
          ? CANVAS_HEIGHT - 120
          : CANVAS_HEIGHT + 120;
        console.log(canvasWidth, canvasHeight);
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
        Matter.Bodies.rectangle(
          -wallThickness / 2,
          wallY,
          wallThickness,
          wallHeight,
          {
            isStatic: true,
            // render: { fillStyle: "#2a2b33" },
          },
        ),
        Matter.Bodies.rectangle(
          CANVAS_WIDTH + wallThickness / 2,
          wallY,
          wallThickness,
          wallHeight,
          {
            isStatic: true,
            // render: { fillStyle: "#2a2b33" },
          },
        ),
        Matter.Bodies.rectangle(
          CANVAS_WIDTH / 2,
          wallHeight,
          CANVAS_WIDTH + wallThickness * 2,
          wallThickness,
          {
            isStatic: true,
            // render: { fillStyle: "#2a2b33" },
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
        const width = options.width;
        const height = options.height;

        ctx.save();

        // 1) Compute scaleX and scaleY
        const scaleX = (width ?? 0) / (bounds.max.x - bounds.min.x);
        const scaleY = (height ?? 0) / (bounds.max.y - bounds.min.y);

        // 2) Apply Scale and Translate according to the camera
        ctx.scale(scaleX, scaleY);
        ctx.translate(-bounds.min.x, -bounds.min.y);

        // 3) Now draw text with Matter coordinates
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 16px Arial"; // Depending on preference and mobile/desktop

        zones.forEach((zone) => {
          const val = parseFloat(zone.label.split("-")[1]);
          const text = val + "x";

          // The center of the Zone is zone.position.x, zone.position.y
          // If you want it slightly above or below, add/subtract a few pixels
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

      // Compute ball radius dynamically based on rows
      const radius = getBallRadius(rows);

      // Generate random horizontal offset for ball drop
      const xRand = (Math.random() - 0.5) * 20;

      const ball = Matter.Bodies.circle(CANVAS_WIDTH / 2 + xRand, -70, radius, {
        restitution: 0.7, // Lower restitution means less bounciness
        friction: 0.9, // Higher friction to slow the ball's horizontal movement
        frictionAir: 0.02, // Higher frictionAir reduces excessive side movement
        density: 0.1, // Adjust density as needed
        render: { fillStyle: "#ff4500" }, // Customize ball color
      });

      // Give the ball a small downward velocity to start
      Matter.Body.setVelocity(ball, { x: 0, y: 2 });

      Matter.World.add(engine.world, ball);

      // Handle collision events
      const handleCollision = (evt: Matter.IEventCollision<Matter.Engine>) => {
        evt.pairs.forEach((pair) => {
          const bodies = [pair.bodyA, pair.bodyB];
          const zone = bodies.find((b) => b.label?.startsWith("multiplier-"));
          if (zone && bodies.includes(ball)) {
            const multiplier = Number.parseFloat(zone.label.split("-")[1]);
            setTimeout(() => {
              onBallEnd(multiplier); // Pass the multiplier to the parent component
              Matter.World.remove(engine.world, ball); // Remove the ball after collision
            }, 10);
            Matter.Events.off(engine, "collisionStart", handleCollision); // Remove the event listener
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

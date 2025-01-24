"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import Matter from "matter-js";
import { RiskLevel } from "@/types/game";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PLINKO_CONFIG,
  PEG_RADIUS,
} from "@/config/game";

export interface GameBoardHandle {
  dropBall: () => void;
}

interface GameBoardProps {
  risk: RiskLevel;
  rows: number;
  onBallEnd: (multiplier: number) => void;
}

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(
  function GameBoard({ risk, rows, onBallEnd }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    // تابعی برای ساخت آرایهٔ ضرایب mirror شده
    const createMirroredMultipliers = (multipliers: any[]) => {
      const mirrored = [...multipliers];
      const reversed = [...multipliers].reverse();
      // برای اینکه المان وسط دوبار تکرار نشود
      mirrored.pop();
      return [...reversed, ...mirrored];
    };

    useEffect(() => {
      if (!engineRef.current) {
        const engine = Matter.Engine.create({
          gravity: { x: 0, y: 1, scale: 0.0012 },
        });
        engineRef.current = engine;

        const render = Matter.Render.create({
          canvas: canvasRef.current as HTMLCanvasElement,
          engine,
          options: {
            width: CANVAS_WIDTH, // اندازه ثابت بوم
            height: CANVAS_HEIGHT,
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

      // پاک کردن world قبلی
      Matter.World.clear(engine.world, false);

      const baseWidth = CANVAS_WIDTH;
      const baseHeight = CANVAS_HEIGHT;

      // دیوارهای کناری
      const leftWall = Matter.Bodies.rectangle(
        -10,
        baseHeight / 2,
        20,
        baseHeight,
        {
          isStatic: true,
        },
      );
      const rightWall = Matter.Bodies.rectangle(
        baseWidth + 10,
        baseHeight / 2,
        20,
        baseHeight,
        { isStatic: true },
      );
      const bottomWall = Matter.Bodies.rectangle(
        baseWidth / 2,
        baseHeight + 10,
        baseWidth,
        20,
        { isStatic: true },
      );

      // ساخت پگ‌ها
      const marginX = 40;
      const availableWidth = baseWidth - marginX * 2;
      // هر چه rows بزرگ‌تر باشد، فاصلهٔ عمودی را کمی کمتر یا بیشتر تنظیم کنید
      const verticalGap = 50;
      const startY = 80;
      const pegs: Matter.Body[] = [];

      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const numPegs = rowIndex + 3;
        const rowWidth = (numPegs - 1) * (availableWidth / (rows + 2 - 1));
        const startXForRow = (baseWidth - rowWidth) / 2;

        for (let col = 0; col < numPegs; col++) {
          const pegX = startXForRow + col * (availableWidth / (rows + 2 - 1));
          const pegY = startY + rowIndex * verticalGap;
          const peg = Matter.Bodies.circle(pegX, pegY, PEG_RADIUS, {
            isStatic: true,
            render: {
              fillStyle: "#ffffff",
            },
          });
          pegs.push(peg);
        }
      }

      // ساخت ناحیه‌های ضرایب (DROP ZONES)
      const baseMultipliers = PLINKO_CONFIG[risk][rows] || [];
      const mirroredMultipliers = createMirroredMultipliers(baseMultipliers);

      const zoneWidth = availableWidth / mirroredMultipliers.length;
      const zoneHeight = 40;
      const zones = mirroredMultipliers.map((mult, i) => {
        return Matter.Bodies.rectangle(
          marginX + i * zoneWidth + zoneWidth / 2,
          startY + rows * verticalGap + zoneHeight / 2 + 10, // کمی بالاتر/پایین‌تر بسته به نیاز
          zoneWidth - 2,
          zoneHeight,
          {
            isStatic: true,
            isSensor: true,
            label: `multiplier-${mult.value}`,
            render: { fillStyle: mult.color },
          },
        );
      });

      Matter.World.add(engine.world, [
        leftWall,
        rightWall,
        bottomWall,
        ...pegs,
        ...zones,
      ]);

      // برای نمایش متن ضرایب داخل باکس‌ها:
      const handleAfterRender = () => {
        const ctx = render.context;
        // بهتر است Scale و Translate اگر لازم است اینجا انجام شود
        // اما برای سادگی همین‌جا ساده می‌نویسیم
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";

        zones.forEach((zoneBody) => {
          const val = parseFloat(zoneBody.label.split("-")[1]);
          const text = String(val);
          // مرکز محل باکس
          const x = zoneBody.position.x - ctx.measureText(text).width / 2;
          const y = zoneBody.position.y + 6; // کمی پایین‌تر از مرکز
          ctx.fillText(text, x, y);
        });

        ctx.restore();
      };
      Matter.Events.on(render, "afterRender", handleAfterRender);

      // حالا که همه اجزا رو ساختیم، محدودهٔ مورد نظر رو به Matter.js می‌گیم تا خودش زوم رو تنظیم کنه
      // minX, minY می‌تونه 0 یا یه مقدار منفی مثل -10 باشه (بسته به دیوار سمت چپ)
      // maxX, maxY هم باید کل ارتفاع/عرض رو کاور کنه
      // کمی حاشیه برای اطمینان:
      const extraMargin = 40;
      const minBounds = { x: -10 - extraMargin, y: 0 - extraMargin };
      // انتهای پایین هم تا ارتفاع کلی
      // یعنی جایی که آخرین ردیف پگ + باکس ضریب‌ها ساخته شده
      const lastZoneY = startY + rows * verticalGap + zoneHeight + 20;
      const maxBounds = {
        x: baseWidth + 10 + extraMargin,
        // اگر احتمال دارد پایین از baseHeight فراتر رود
        // می‌توانید ماکزیمم را کمی بالاتر بگذارید
        y: Math.max(lastZoneY, baseHeight) + extraMargin,
      };

      Matter.Render.lookAt(render, {
        min: minBounds,
        max: maxBounds,
      });

      // پاک کردن event قبلی در cleanup
      return () => {
        Matter.Events.off(render, "afterRender", handleAfterRender);
      };
    }, [risk, rows]);

    // تابع رها کردن توپ
    const dropBall = () => {
      if (!engineRef.current) return;
      const engine = engineRef.current;
      const xRand = (Math.random() - 0.5) * 80;

      // دقت کنید که مختصات توپ با همان سیستمی است که دیوارها و پگ‌ها را ساختید
      const ball = Matter.Bodies.circle(400 + xRand, 10, 8, {
        restitution: 0.3,
        friction: 0.001,
        render: { fillStyle: "#fb923c" },
      });

      Matter.Body.setVelocity(ball, { x: 0, y: 1 });
      Matter.World.add(engine.world, ball);

      const handleCollision = (evt: Matter.IEventCollision<Matter.Engine>) => {
        evt.pairs.forEach((pair) => {
          const bodies = [pair.bodyA, pair.bodyB];
          const zone = bodies.find((b) => b.label?.startsWith("multiplier-"));
          if (zone && bodies.includes(ball)) {
            const val = parseFloat(zone.label.split("-")[1]);
            onBallEnd(val);
            setTimeout(() => {
              Matter.World.remove(engine.world, ball);
            }, 300);
            Matter.Events.off(engine, "collisionStart", handleCollision);
          }
        });
      };

      Matter.Events.on(engine, "collisionStart", handleCollision);
    };

    useImperativeHandle(ref, () => ({ dropBall }));

    return (
      <div
        style={{
          position: "relative",
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}>
        <canvas ref={canvasRef} />
      </div>
    );
  },
);

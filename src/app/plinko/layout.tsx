"use client";
import { GameProvider } from "@/context/GameContext";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return <GameProvider>{children}</GameProvider>;
}

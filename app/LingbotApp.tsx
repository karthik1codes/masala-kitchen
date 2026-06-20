"use client";

import { LingbotProvider } from "@reactor-models/lingbot";
import { KitchenPlanProvider } from "./context/KitchenPlanContext";
import { Header } from "./components/Header";
import { StatusBadge } from "./components/StatusBadge";
import { CommandError } from "./components/CommandError";
import { NowPlaying } from "./components/NowPlaying";
import { KitchenControls } from "./components/KitchenControls";
import { CustomOrderSetup } from "./components/CustomOrderSetup";
import { ImageStarter } from "./components/ImageStarter";
import { SnapClip } from "./components/SnapClip";
import { Video } from "./components/Video";

async function fetchToken(): Promise<string> {
  let r: Response;
  try {
    r = await fetch("/api/reactor/token");
  } catch {
    throw new Error(
      "Could not reach /api/reactor/token. Is the dev server running on this port?",
    );
  }
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Token fetch failed: ${r.status}`);
  }
  const { jwt } = (await r.json()) as { jwt: string };
  return jwt;
}

export function LingbotApp() {
  return (
    <LingbotProvider getJwt={fetchToken}>
      <KitchenPlanProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
            <aside className="flex w-full flex-col gap-4 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:max-h-[calc(100vh-4rem)]">
              <StatusBadge />
              <CommandError />
              <CustomOrderSetup />
              <NowPlaying />
              <KitchenControls />
              <ImageStarter />
              <SnapClip />
            </aside>
            <section className="flex-1">
              <Video />
            </section>
          </main>
        </div>
      </KitchenPlanProvider>
    </LingbotProvider>
  );
}

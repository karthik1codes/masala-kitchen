"use client";

import dynamic from "next/dynamic";

const LingbotApp = dynamic(
  () => import("./LingbotApp").then((mod) => mod.LingbotApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading Masala Kitchen…
      </div>
    ),
  },
);

export function LingbotAppLoader() {
  return <LingbotApp />;
}

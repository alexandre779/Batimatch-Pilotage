"use client";

import Link from "next/link";

export function PresentationControls({ backHref }: { backHref: string }) {
  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  return <div className="presentationControls"><Link href={backHref}>← Retour au tableau de bord</Link><button type="button" onClick={toggleFullscreen}>⛶ Plein écran</button></div>;
}

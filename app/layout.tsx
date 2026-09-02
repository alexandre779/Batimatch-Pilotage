import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Batimatch Pilotage",
  description: "Pilotage du réseau Batimatch"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

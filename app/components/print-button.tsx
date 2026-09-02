"use client";

export function PrintButton() {
  return <button className="printButton" type="button" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>;
}

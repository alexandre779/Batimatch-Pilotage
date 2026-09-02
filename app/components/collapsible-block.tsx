import type { ReactNode } from "react";

export function CollapsibleBlock({ eyebrow, title, hint, children, defaultOpen = false, id }: { eyebrow: string; title: string; hint?: string; children: ReactNode; defaultOpen?: boolean; id?: string }) {
  return (
    <details className="collapsibleBlock" open={defaultOpen || undefined} id={id}>
      <summary>
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{hint && <p>{hint}</p>}</div>
        <span className="collapseAction"><i className="collapseExpand">Déployer</i><i className="collapseReduce">Réduire</i><b aria-hidden="true">⌄</b></span>
      </summary>
      <div className="collapsibleContent">{children}</div>
    </details>
  );
}

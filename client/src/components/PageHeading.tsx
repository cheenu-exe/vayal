import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading-row"><div className="page-heading-copy"><span className="eyebrow"><i className="eyebrow-rule" />{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

export function DemoNotice({ children, variant = "warm" }: { children: ReactNode; variant?: "warm" | "green" }) {
  return <div className={`demo-notice demo-notice-${variant}`} role="note"><span className="demo-notice-dot" />{children}</div>;
}

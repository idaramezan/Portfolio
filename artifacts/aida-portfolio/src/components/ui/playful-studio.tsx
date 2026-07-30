import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StudioWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn("studio-wordmark", compact && "studio-wordmark--compact")}>
      <span>Aida Ramezani</span>
      {!compact && <small>artist · Istanbul</small>}
    </span>
  );
}

export function PaperTag({
  children,
  tone = "pink",
  as: Component = "span",
  className,
}: {
  children: ReactNode;
  tone?: "pink" | "butter" | "mint" | "sky" | "lilac";
  as?: ElementType;
  className?: string;
}) {
  return (
    <Component className={cn("paper-tag", `paper-tag--${tone}`, className)}>
      {children}
    </Component>
  );
}

export function UtilityMessage({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "success" | "error";
}) {
  return <div className={`utility-message utility-message--${kind}`}>{children}</div>;
}

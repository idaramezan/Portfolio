import type { ButtonHTMLAttributes, ElementType, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export function StudioWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn("studio-wordmark", compact && "studio-wordmark--compact")}>
      <span>Aida Ramezani</span>
      {!compact && <small>oil pastel artist</small>}
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

export function PaperButton({
  children,
  href,
  variant = "pink",
  size = "md",
  arrow = false,
  className,
  ...buttonProps
}: {
  children: ReactNode;
  href?: string;
  variant?: "pink" | "blue" | "cream-outline" | "text-link";
  size?: "sm" | "md" | "lg";
  arrow?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const content = <><span>{children}</span>{arrow && <ArrowRight aria-hidden="true" />}</>;
  const classes = cn("paper-button", `paper-button--${variant}`, `paper-button--${size}`, className);
  const { onClick, ...nativeButtonProps } = buttonProps;
  if (href) return <Link href={href} className={classes} onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}>{content}</Link>;
  return <button className={classes} onClick={onClick} {...nativeButtonProps}>{content}</button>;
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

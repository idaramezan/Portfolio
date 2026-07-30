import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; arrow?: boolean };

export default function CuteActionButton({ children, arrow = true, className = "", ...props }: Props) {
  return <a {...props} className={`cute-action-button ${className}`.trim()}>{children}{arrow && <ArrowUpRight className="cute-action-button__arrow" aria-hidden="true" />}</a>;
}

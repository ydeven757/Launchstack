import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "danger" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-border/40 text-fg border-border",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/20",
  outline: "border-border text-muted",
};

export function Badge({
  variant = "default",
  className,
  style,
  children,
}: {
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6 rounded-lg border border-dashed border-border bg-card/50", className)}>
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h3 className="font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

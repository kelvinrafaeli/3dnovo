import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/10",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-brand-accent transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export { Progress };

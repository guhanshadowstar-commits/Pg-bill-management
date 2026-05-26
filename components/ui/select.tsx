import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-gold/40 focus:ring dark:border-white/15 dark:bg-black/20",
        props.className
      )}
    />
  );
}

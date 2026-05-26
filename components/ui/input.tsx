import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-gold/40 placeholder:text-mist focus:ring dark:border-white/15 dark:bg-black/20",
        props.className
      )}
    />
  );
}

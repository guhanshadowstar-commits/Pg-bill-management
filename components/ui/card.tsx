import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-black/5 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-luxe", className)}>
      {children}
    </section>
  );
}

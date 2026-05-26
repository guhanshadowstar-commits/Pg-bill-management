"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const nextDark = saved ? saved === "dark" : true;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <button
      onClick={toggle}
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-1.5 text-xs dark:border-white/15"
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      {dark ? "Light" : "Dark"}
    </button>
  );
}

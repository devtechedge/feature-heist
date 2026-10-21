"use client";
import { useEffect, useState } from "react";

const Sun = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>);
const Moon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>);

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { setTheme((document.documentElement.dataset.theme as "dark" | "light") ?? "dark"); }, []);
  const next = theme === "dark" ? "light" : "dark";
  const flip = () => {
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  };
  return (
    <button className="theme-toggle" onClick={flip} aria-label={`Switch to ${next} mode`} data-testid="theme-toggle">
      <span className={`icon ${theme === "dark" ? "on" : ""}`}><Sun /></span>
      <span className={`icon ${theme === "light" ? "on" : ""}`}><Moon /></span>
    </button>
  );
}

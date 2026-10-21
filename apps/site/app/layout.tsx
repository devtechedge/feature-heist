import "./globals.css";
import type { ReactNode } from "react";
import ThemeToggle from "../components/ThemeToggle";

const base = process.env.SITE_BASE_PATH ?? "";
export const metadata = {
  title: "Feature Heist",
  description: "Rebuild features from apps you can inspect: REA evidence in, tested TypeScript rebuild out.",
  icons: { icon: `${base}/favicon.svg` },
};

// Runs before first paint so the stored theme never flashes.
const boot = `try{var t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: boot }} /></head>
      <body><div className="wrap">
        <header className="top">
          <h1><a href={`${base}/`} style={{ textDecoration: "none" }}>Feature <span>Heist</span></a></h1>
          <nav className="mono actions"><a href="https://github.com/devtechedge/feature-heist">GitHub</a><a href="https://github.com/morluto/rea">REA</a><ThemeToggle /></nav>
        </header>
        {children}
        <footer className="muted" style={{ marginTop: 60 }}>Lawful analysis only: open-source targets, public APIs and interoperability.</footer>
      </div></body>
    </html>
  );
}

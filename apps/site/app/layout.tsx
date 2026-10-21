import "./globals.css";
import type { ReactNode } from "react";
export const metadata = { title: "Feature Heist", description: "Rebuild features from apps you can inspect: REA evidence in, tested reimplementation out." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"><body><div className="wrap">
      <header className="top"><h1><a href="./" style={{ textDecoration: "none" }}>Feature <span>Heist</span></a></h1>
        <nav className="mono"><a href="https://github.com/devtechedge/feature-heist">GitHub</a> · <a href="https://github.com/morluto/rea">REA</a></nav></header>
      {children}
      <footer className="muted" style={{ marginTop: 60 }}>Lawful analysis only: open-source targets, public APIs and interoperability. See DISCLAIMER in the repo.</footer>
    </div></body></html>
  );
}

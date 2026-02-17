"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <div className="logo-icon">402</div>
          <div className="logo-text">
            <span>x402</span> Demo
          </div>
        </Link>

        <nav className="nav-links">
          <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
            Home
          </Link>
          <Link href="/demo" className={`nav-link ${pathname === "/demo" ? "active" : ""}`}>
            Live Demo
          </Link>
          <a
            href="https://github.com/coinbase/x402"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            GitHub ↗
          </a>
          <a
            href="https://docs.x402.org"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            Docs ↗
          </a>
          <Link href="/demo" className="btn-primary">
            Try Demo →
          </Link>
        </nav>
      </div>
    </header>
  );
}

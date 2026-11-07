"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppNav.module.css";

const LINKS = [
  { href: "/", label: "Discover" },
  { href: "/plan", label: "Plan" },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <span className={styles.brand}>Italy Trip Planner</span>
      <nav aria-label="Main">
        <ul className={styles.links}>
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} className={styles.link} aria-current={active ? "page" : undefined}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

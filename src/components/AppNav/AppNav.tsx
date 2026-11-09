"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo/Logo";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import styles from "./AppNav.module.css";

const LINKS = [
  { href: "/", label: "Discover" },
  { href: "/plan", label: "Plan" },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="itineraryay home">
        <Logo />
        <span>
          itinerar<span className={styles.yay}>yay</span>
        </span>
      </Link>
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
      <ThemeToggle />
    </header>
  );
}

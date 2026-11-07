"use client";

import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useDebug } from "@/components/Debug/DebugContext";
import styles from "./Suspect.module.css";

interface SuspectProps {
  children: ReactNode;
  /** Why the value is doubtful. Shown only in debug mode. */
  reasons?: readonly string[];
}

/** Highlights a value that may be wrong. Travelers see that it is doubtful, not why. */
export default function Suspect({ children, reasons = [] }: SuspectProps) {
  const debug = useDebug();
  return (
    <span className={styles.suspect} title={debug && reasons.length ? reasons.join("\n") : "May be inaccurate"}>
      <TriangleAlert size={14} aria-hidden="true" className={styles.icon} />
      <span>{children}</span>
      <span className="visually-hidden"> (may be inaccurate)</span>
      {debug &&
        reasons.map((r) => (
          <span key={r} className={styles.reason}>
            {r}
          </span>
        ))}
    </span>
  );
}

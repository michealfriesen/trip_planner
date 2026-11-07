"use client";

import { useId } from "react";
import { SORT_OPTIONS, type SortKey } from "@/lib/discover/sortPlaces";
import styles from "./SortSelect.module.css";

interface SortSelectProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

export default function SortSelect({ value, onChange }: SortSelectProps) {
  const id = useId();
  return (
    <div className={styles.box}>
      <label htmlFor={id} className={styles.label}>
        Sort by
      </label>
      <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value as SortKey)}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

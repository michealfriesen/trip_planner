"use client";

import { useEffect, useId, useState } from "react";
import styles from "./SearchBox.module.css";

interface SearchBoxProps {
  initialValue: string;
  /** Called about 150 ms after typing stops. */
  onSearch: (query: string) => void;
}

const DEBOUNCE_MS = 150;

export default function SearchBox({ initialValue, onSearch }: SearchBoxProps) {
  const id = useId();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const t = setTimeout(() => onSearch(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, onSearch]);

  return (
    <div className={styles.box}>
      <label htmlFor={id} className={styles.label}>
        Search
      </label>
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder="Name, tag or description"
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

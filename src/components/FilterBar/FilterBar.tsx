"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { categoryLabel } from "@/components/CategoryIcon/CategoryIcon";
import { CATEGORY_GROUPS } from "@/lib/config";
import type { FilterCriteria, FilterOptions } from "@/lib/discover/filterPlaces";
import type { Category, Price } from "@/lib/types";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  options: FilterOptions;
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  onClear: () => void;
}

function groupLabel(group: string): string {
  return group in CATEGORY_GROUPS ? group : categoryLabel(group as Category);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface CheckboxGroupProps<T extends string | number> {
  legend: string;
  values: T[];
  selected: T[];
  label: (value: T) => ReactNode;
  onChange: (selected: T[]) => void;
}

function CheckboxGroup<T extends string | number>({ legend, values, selected, label, onChange }: CheckboxGroupProps<T>) {
  return (
    <details name="filter" className={styles.group}>
      <summary className={styles.summary}>
        {legend}
        {selected.length > 0 && <span className={styles.count}>{selected.length}</span>}
      </summary>
      <fieldset className={styles.panel}>
        <legend className="visually-hidden">{legend}</legend>
        {values.map((v) => (
          <label key={v} className={styles.option}>
            <input type="checkbox" checked={selected.includes(v)} onChange={() => onChange(toggle(selected, v))} />
            {label(v)}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

export default function FilterBar({ options, criteria, onChange, onClear }: FilterBarProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close an open filter panel on a click outside the bar, or on Escape.
  useEffect(() => {
    const closeAll = () => ref.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) closeAll();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = ref.current?.querySelector("details[open]");
      if (!open) return;
      closeAll();
      open.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const active =
    criteria.categoryGroups.length + criteria.cities.length + criteria.prices.length + criteria.tags.length > 0 ||
    criteria.query.trim() !== "" ||
    criteria.showNotInterested;

  return (
    <div ref={ref} className={styles.bar} role="group" aria-label="Filters">
      <div className={styles.groups}>
        <CheckboxGroup
          legend="Category"
          values={options.categoryGroups}
          selected={criteria.categoryGroups}
          label={groupLabel}
          onChange={(categoryGroups) => onChange({ ...criteria, categoryGroups })}
        />
        <CheckboxGroup
          legend="City"
          values={options.cities}
          selected={criteria.cities}
          label={(c) => c}
          onChange={(cities) => onChange({ ...criteria, cities })}
        />
        <CheckboxGroup<Price>
          legend="Price"
          values={options.prices}
          selected={criteria.prices}
          label={(p) => (
            <>
              <span aria-hidden="true">{"€".repeat(p)}</span>
              <span className="visually-hidden">Price level {p} of 4</span>
            </>
          )}
          onChange={(prices) => onChange({ ...criteria, prices })}
        />
        <CheckboxGroup
          legend="Tags"
          values={options.tags}
          selected={criteria.tags}
          label={(t) => t}
          onChange={(tags) => onChange({ ...criteria, tags })}
        />
      </div>
      <div className={styles.actions}>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={criteria.showNotInterested}
            onChange={(e) => onChange({ ...criteria, showNotInterested: e.target.checked })}
          />
          Show not interested
        </label>
        <button type="button" className={styles.clear} onClick={onClear} disabled={!active}>
          Clear filters
        </button>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import type { Field } from "@/lib/types";
import styles from "./FieldValue.module.css";

interface FieldValueProps<T> {
  field: Field<T>;
  render: (value: T) => ReactNode;
  /** Show "Unknown" instead of nothing when the value is missing. */
  showMissing?: boolean;
}

export default function FieldValue<T>({ field, render, showMissing = false }: FieldValueProps<T>) {
  switch (field.status) {
    case "ok":
      return <>{render(field.value)}</>;
    case "missing":
      return showMissing ? <span className={styles.unknown}>Unknown</span> : null;
    case "invalid":
      return (
        <span>
          {field.raw}{" "}
          <span className={styles.inaccurate} title={field.reason}>
            may be inaccurate
            <span className="visually-hidden">: {field.reason}</span>
          </span>
        </span>
      );
  }
}

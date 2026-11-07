"use client";

import type { ReactNode } from "react";
import Suspect from "@/components/Suspect/Suspect";
import type { Field } from "@/lib/types";

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
      return showMissing ? <Suspect reasons={["Not in the source data."]}>Unknown</Suspect> : null;
    case "invalid":
      return <Suspect reasons={[field.reason]}>{field.raw}</Suspect>;
  }
}

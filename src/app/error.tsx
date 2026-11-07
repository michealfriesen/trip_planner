"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <main style={{ padding: "var(--space-6)" }} role="alert">
      <h1>Something went wrong</h1>
      <p style={{ margin: "var(--space-3) 0" }}>Please try again.</p>
      <button
        type="button"
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        Try again
      </button>
    </main>
  );
}

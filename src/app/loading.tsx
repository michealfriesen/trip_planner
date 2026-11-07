export default function Loading() {
  return (
    <main style={{ padding: "var(--space-6)" }} aria-busy="true">
      <p role="status">Loading places…</p>
    </main>
  );
}

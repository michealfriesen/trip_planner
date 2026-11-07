import styles from "./SnapshotNotice.module.css";

export default function SnapshotNotice() {
  return (
    <p role="status" className={styles.notice}>
      Live place data could not be loaded. Showing a saved copy.
    </p>
  );
}

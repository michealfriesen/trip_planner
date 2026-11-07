import DiscoverView from "@/components/DiscoverView/DiscoverView";
import SnapshotNotice from "@/components/SnapshotNotice/SnapshotNotice";
import { getDataset } from "@/lib/data/getDataset";

export const revalidate = 0;

export default async function DiscoverPage() {
  const { dataset, source } = await getDataset();
  return (
    <main>
      {source === "snapshot" && <SnapshotNotice />}
      <DiscoverView places={dataset.places} issues={dataset.issues} fetchedAt={dataset.fetchedAt} />
    </main>
  );
}

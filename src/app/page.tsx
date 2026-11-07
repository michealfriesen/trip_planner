import DiscoverView from "@/components/DiscoverView/DiscoverView";
import { DebugProvider } from "@/components/Debug/DebugContext";
import SnapshotNotice from "@/components/SnapshotNotice/SnapshotNotice";
import { getDataset } from "@/lib/data/getDataset";

export const revalidate = 0;

interface DiscoverPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const [{ dataset, source }, params] = await Promise.all([getDataset(), searchParams]);
  const debug = params.debug !== undefined && params.debug !== "0";
  // `?place=<id>` (from the Plan page) opens that place on the full-screen map.
  const linkedPlaceId = typeof params.place === "string" ? params.place : undefined;
  return (
    <main>
      {source === "snapshot" && <SnapshotNotice />}
      <DebugProvider debug={debug}>
        <DiscoverView places={dataset.places} issues={dataset.issues} fetchedAt={dataset.fetchedAt}
          linkedPlaceId={linkedPlaceId}
        />
      </DebugProvider>
    </main>
  );
}

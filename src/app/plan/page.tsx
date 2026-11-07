import PlanView from "@/components/PlanView/PlanView";
import SnapshotNotice from "@/components/SnapshotNotice/SnapshotNotice";
import { getDataset } from "@/lib/data/getDataset";

export const revalidate = 0;

export default async function PlanPage() {
  const { dataset, source } = await getDataset();
  return (
    <main>
      {source === "snapshot" && <SnapshotNotice />}
      <PlanView places={dataset.places} />
    </main>
  );
}

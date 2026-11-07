import type { PlaceFlag } from "@/lib/types";
import styles from "./FlagBadge.module.css";

const BADGES: Record<PlaceFlag, { label: string; text: string; tone: "warn" | "info" }> = {
  id_missing: {
    label: "No id",
    text: "The source had no id. Saved choices for this place may be lost if the data changes.",
    tone: "warn",
  },
  id_duplicate: { label: "Duplicate id", text: "Another record has the same id. This one was renamed.", tone: "warn" },
  name_missing: { label: "No name", text: "The source had no name.", tone: "warn" },
  type_unknown: { label: "Unknown type", text: "The source type is not one we know.", tone: "warn" },
  location_unusable: { label: "Location unknown", text: "Missing, or outside the area we plan in.", tone: "warn" },
  hours_normalized: { label: "Hours interpreted", text: "The hours were read with small corrections.", tone: "info" },
  hours_unparsed: { label: "Hours unreadable", text: "The hours text could not be read.", tone: "warn" },
  hours_missing: { label: "Hours unknown", text: "The source has no hours.", tone: "warn" },
  duration_default: { label: "Visit length guessed", text: "No visit length given; 60 minutes is used.", tone: "info" },
  price_unknown: { label: "Price unknown", text: "The source has no usable price.", tone: "info" },
  booking_unknown: {
    label: "Booking unknown",
    text: "The source does not say whether booking is needed.",
    tone: "info",
  },
};

export default function FlagBadge({ badge }: { badge: PlaceFlag }) {
  const { label, text, tone } = BADGES[badge];
  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={text}>
      {label}
      <span className="visually-hidden">: {text}</span>
    </span>
  );
}

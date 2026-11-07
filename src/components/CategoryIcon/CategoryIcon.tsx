import {
  Binoculars,
  Castle,
  CircleHelp,
  Coffee,
  House,
  Landmark,
  ShoppingBag,
  Store,
  Ticket,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Category } from "@/lib/types";
import styles from "./CategoryIcon.module.css";

const CATEGORY_DISPLAY: Record<Category, { Icon: LucideIcon; label: string }> = {
  [Category.HistoricSite]: { Icon: Castle, label: "Historic site" },
  [Category.Restaurant]: { Icon: UtensilsCrossed, label: "Restaurant" },
  [Category.Experience]: { Icon: Ticket, label: "Experience" },
  [Category.Museum]: { Icon: Landmark, label: "Museum" },
  [Category.Viewpoint]: { Icon: Binoculars, label: "Viewpoint" },
  [Category.Cafe]: { Icon: Coffee, label: "Cafe" },
  [Category.Neighborhood]: { Icon: House, label: "Neighborhood" },
  [Category.Market]: { Icon: Store, label: "Market" },
  [Category.Park]: { Icon: Trees, label: "Park" },
  [Category.Shop]: { Icon: ShoppingBag, label: "Shop" },
  [Category.Unknown]: { Icon: CircleHelp, label: "Other" },
};

export function categoryLabel(category: Category): string {
  return CATEGORY_DISPLAY[category].label;
}

export function categoryIcon(category: Category): LucideIcon {
  return CATEGORY_DISPLAY[category].Icon;
}

export default function CategoryIcon({ category }: { category: Category }) {
  const { Icon, label } = CATEGORY_DISPLAY[category];
  return (
    <span className={styles.category}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </span>
  );
}

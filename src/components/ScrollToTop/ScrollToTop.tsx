"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import styles from "./ScrollToTop.module.css";

/** How far down, in pixels, before the button appears. */
const SHOW_AFTER_PX = 400;

/**
 * A "back to top" button for a list. Works whether the list scrolls inside its own pane (wide screens)
 * or the whole page scrolls (narrow screens). Place it as the last child of the scrolling element.
 */
export default function ScrollToTop({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const update = () => {
      setVisible(target.scrollTop > SHOW_AFTER_PX || target.getBoundingClientRect().top < -SHOW_AFTER_PX);
    };
    update();
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
    };
  }, [targetRef]);

  const jump = () => {
    const target = targetRef.current;
    if (!target) return;
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    target.scrollTo({ top: 0, behavior });
    if (target.getBoundingClientRect().top < 0) target.scrollIntoView({ block: "start", behavior });
  };

  return (
    <div className={styles.anchor}>
      <button
        type="button"
        className={`${styles.button} ${visible ? styles.visible : ""}`}
        onClick={jump}
        aria-label="Back to top of list"
        title="Back to top"
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
      >
        <ArrowUp size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

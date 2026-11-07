export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "trip-planner:theme";

/**
 * Runs in <head> before first paint: uses the saved theme, else the system preference.
 * Inlined as a string so the page never flashes the wrong theme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

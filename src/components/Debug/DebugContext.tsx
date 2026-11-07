"use client";

import { createContext, useContext, type ReactNode } from "react";

const DebugContext = createContext(false);

/** Turned on by `?debug` in the URL. Shows why data was flagged, which travelers don't need to see. */
export function DebugProvider({ debug, children }: { debug: boolean; children: ReactNode }) {
  return <DebugContext.Provider value={debug}>{children}</DebugContext.Provider>;
}

export function useDebug(): boolean {
  return useContext(DebugContext);
}

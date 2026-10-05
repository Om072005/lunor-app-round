"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after hydration. Persisted stores read localStorage on the client,
 * so anything rendered from them must wait to avoid server/client mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

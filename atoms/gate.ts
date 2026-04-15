import { atomWithStorage } from "jotai/utils";

export const hasUnlockedAIAtom = atomWithStorage<boolean>(
  "nm_ai_unlocked",
  false,
);

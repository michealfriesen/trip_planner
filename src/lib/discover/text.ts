/** Lowercases and removes accents, so "Caffè" matches "caffe". */
export function foldText(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export type LayoutItem = { i: string; x: number; y: number; w: number; h: number };

export function nextLayoutItem(layout: LayoutItem[], id: string, size: { w: number; h: number }): LayoutItem {
  const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  return { i: id, x: 0, y: maxY, w: size.w, h: size.h };
}

/**
 * react-grid-layout can emit a layout from the previous children after a second
 * panel was already added. Keep any current item the grid callback dropped.
 */
export function mergeLayout(current: LayoutItem[], fromGrid: LayoutItem[], widgetIds: string[]): LayoutItem[] {
  const alive = new Set(widgetIds);
  const seen = new Set<string>();
  const merged: LayoutItem[] = [];
  const take = (item: LayoutItem) => {
    if (!alive.has(item.i) || seen.has(item.i)) return;
    seen.add(item.i);
    merged.push({ i: item.i, x: item.x, y: item.y, w: item.w, h: item.h });
  };
  for (const item of fromGrid) take(item);
  for (const item of current) take(item);
  return merged;
}

export function layoutsEqual(a: LayoutItem[], b: LayoutItem[]): boolean {
  if (a.length !== b.length) return false;
  const other = new Map(b.map((item) => [item.i, item]));
  return a.every((item) => {
    const match = other.get(item.i);
    return !!match && match.x === item.x && match.y === item.y && match.w === item.w && match.h === item.h;
  });
}

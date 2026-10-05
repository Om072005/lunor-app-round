/**
 * Minimal layered (BFS) layout for small directed graphs — screen flows and file
 * import maps have < 30 nodes, so a dagre-sized dependency isn't worth it.
 */
export interface LayoutPosition {
  x: number;
  y: number;
  layer: number;
}

export function layeredLayout(
  nodes: readonly string[],
  edges: ReadonlyArray<readonly [string, string]>,
  spacing = { x: 260, y: 110 },
): Record<string, LayoutPosition> {
  const known = new Set(nodes);
  const children = new Map<string, string[]>(nodes.map((n) => [n, []]));
  const hasParent = new Set<string>();
  for (const [from, to] of edges) {
    if (!known.has(from) || !known.has(to) || from === to) continue;
    children.get(from)!.push(to);
    hasParent.add(to);
  }

  const layer = new Map<string, number>();
  const bfs = (seeds: string[]) => {
    const queue = seeds.filter((s) => !layer.has(s));
    queue.forEach((s) => layer.set(s, 0));
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const child of children.get(node)!) {
        if (layer.has(child)) continue;
        layer.set(child, layer.get(node)! + 1);
        queue.push(child);
      }
    }
  };
  // The first node is the entry (home screen / App.js) even when cycles give it a parent.
  bfs([...nodes.slice(0, 1), ...nodes.filter((n) => !hasParent.has(n))]);
  for (const n of nodes) if (!layer.has(n)) bfs([n]);

  const rows = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layer.get(n)!;
    rows.set(l, [...(rows.get(l) ?? []), n]);
  }

  const out: Record<string, LayoutPosition> = {};
  for (const [l, members] of rows) {
    const offset = ((members.length - 1) * spacing.y) / 2;
    members.forEach((n, i) => {
      out[n] = { x: l * spacing.x, y: i * spacing.y - offset, layer: l };
    });
  }
  return out;
}

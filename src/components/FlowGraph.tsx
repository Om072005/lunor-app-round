"use client";

import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { layeredLayout } from "@/lib/graph-layout";

// A type alias (not an interface) so it satisfies React Flow's Record<string, unknown> data constraint.
export type GraphNode = {
  id: string;
  title: string;
  subtitle?: string;
  tone?: "accent" | "info" | "ok" | "warn" | "neutral";
};

const TONE_BORDER: Record<NonNullable<GraphNode["tone"]>, string> = {
  accent: "#ef4444",
  info: "#60a5fa",
  ok: "#22c55e",
  warn: "#f59e0b",
  neutral: "#3a3a3a",
};

type CardData = GraphNode & { selected?: boolean };

function CardNode({ data }: NodeProps<Node<CardData>>) {
  return (
    <div
      className="w-[200px] rounded-xl border bg-surface-2 px-3 py-2 text-left shadow-lg"
      style={{ borderColor: TONE_BORDER[data.tone ?? "neutral"], boxShadow: data.selected ? `0 0 0 2px ${TONE_BORDER[data.tone ?? "neutral"]}` : undefined }}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-faint" />
      <p className="truncate text-xs font-semibold text-fg">{data.title}</p>
      {data.subtitle && <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted">{data.subtitle}</p>}
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-faint" />
    </div>
  );
}

const nodeTypes = { card: CardNode };

export function FlowGraph({
  nodes,
  edges,
  height = 360,
  selectedId,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: [string, string][];
  height?: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const { rfNodes, rfEdges } = useMemo(() => {
    const pos = layeredLayout(nodes.map((n) => n.id), edges);
    const rfNodes: Node<CardData>[] = nodes.map((n) => ({
      id: n.id,
      type: "card",
      position: { x: pos[n.id]?.x ?? 0, y: pos[n.id]?.y ?? 0 },
      data: { ...n, selected: n.id === selectedId },
    }));
    const ids = new Set(nodes.map((n) => n.id));
    const rfEdges: Edge[] = edges
      .filter(([a, b]) => ids.has(a) && ids.has(b) && a !== b)
      .map(([a, b]) => ({
        id: `${a}->${b}`,
        source: a,
        target: b,
        animated: true,
        style: { stroke: "#ef4444", strokeOpacity: 0.55 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
      }));
    return { rfNodes, rfEdges };
  }, [nodes, edges, selectedId]);

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-line bg-bg">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        nodesConnectable={false}
        nodesDraggable
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        minZoom={0.3}
      >
        <Background color="#222" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

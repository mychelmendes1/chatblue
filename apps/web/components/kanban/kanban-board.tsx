"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn, type ColumnId } from "./kanban-column";
import type { KanbanTicket } from "./kanban-card";

interface ColumnConfig {
  id: ColumnId;
  title: string;
  color: string;
}

const columns: ColumnConfig[] = [
  { id: "novos", title: "Novos", color: "#f59e0b" },
  { id: "em_atendimento", title: "Em Atendimento", color: "#3b82f6" },
  { id: "aguardando", title: "Aguardando", color: "#8b5cf6" },
  { id: "resolvidos", title: "Resolvidos", color: "#22c55e" },
];

interface KanbanBoardProps {
  ticketsByColumn: Record<ColumnId, KanbanTicket[]>;
  onDragEnd: (result: DropResult) => void;
}

export function KanbanBoard({ ticketsByColumn, onDragEnd }: KanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tickets={ticketsByColumn[column.id] || []}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

export { columns };
export type { ColumnConfig, ColumnId };

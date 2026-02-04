"use client";

import { useState, useEffect } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { KanbanCard, type KanbanTicket } from "./kanban-card";
import { cn } from "@/lib/utils";

export type ColumnId = "novos" | "em_atendimento" | "aguardando" | "resolvidos";

const ITEMS_PER_PAGE = 20;

interface KanbanColumnProps {
  id: ColumnId;
  title: string;
  tickets: KanbanTicket[];
  color: string;
}

export function KanbanColumn({ id, title, tickets, color }: KanbanColumnProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset visible count when tickets change significantly
  useEffect(() => {
    // If tickets reduced below visible count, adjust
    if (tickets.length < visibleCount && tickets.length <= ITEMS_PER_PAGE) {
      setVisibleCount(ITEMS_PER_PAGE);
    }
  }, [tickets.length, visibleCount]);

  const visibleTickets = tickets.slice(0, visibleCount);
  const hasMore = tickets.length > visibleCount;
  const remainingCount = tickets.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px] bg-muted/30 rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b rounded-t-lg"
        style={{ borderBottomColor: color }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + "20", color: color }}
        >
          {tickets.length}
        </span>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-hidden",
              snapshot.isDraggingOver && "bg-primary/5"
            )}
          >
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2 min-h-[200px]">
                {visibleTickets.map((ticket, index) => (
                  <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <KanbanCard
                          ticket={ticket}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {/* Load More Button */}
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    className="w-full mt-2 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Carregar mais ({remainingCount})
                  </Button>
                )}

                {tickets.length === 0 && !snapshot.isDraggingOver && (
                  <div className="flex items-center justify-center h-[100px] text-sm text-muted-foreground">
                    Nenhum ticket
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </Droppable>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Obligation } from "@/types";
import { GripVertical, Building2, Calendar as CalIcon, Mail, Coins } from "lucide-react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface ObligationsListProps {
  obligations: Obligation[];
  onOrderChange: (newOrder: Obligation[], movedId?: string, shiftIndex?: number) => void;
  onHoverAction: (action: 'email' | 'micropayment', obligation: Obligation) => void;
}

export function ObligationsList({ obligations, onOrderChange, onHoverAction }: ObligationsListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Local state for immediate DND visual feedback before backend commit
  const [localObligations, setLocalObligations] = useState(obligations);
  
  // Sync if props change
  React.useEffect(() => {
    setLocalObligations(obligations);
  }, [obligations]);
  
  const pendingObligations = localObligations.filter((o) => o.status === "pending");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = pendingObligations.findIndex((o) => o.id === active.id);
      const newIndex = pendingObligations.findIndex((o) => o.id === over?.id);
      
      const newItems = arrayMove(pendingObligations, oldIndex, newIndex);
      
      // Update locally immediately
      const updatedFullList = [...localObligations];
      const activeItem = updatedFullList.find(o => o.id === active.id);
      if (activeItem) {
         // Create a synthetic delay purely for UI immediately
         activeItem.due_date = new Date(new Date(activeItem.due_date).getTime() + (newIndex - oldIndex) * 3 * 86400000).toISOString().split('T')[0];
         setLocalObligations(updatedFullList);
      }
      
      // Calculate hypothetical shift based on array position
      const shiftIndex = newIndex - oldIndex;
      onOrderChange(newItems, active.id as string, shiftIndex);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm h-full flex flex-col animate-in slide-in-from-left-4 duration-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-extrabold text-foreground">Upcoming Payments</h3>
          <p className="text-xs text-muted-foreground">Manage and defer liquidity obligations</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}>List</button>
          <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}>Calendar</button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pendingObligations.map(o => o.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {pendingObligations.map((ob, idx) => (
                  <SortableItem key={ob.id} obligation={ob} index={idx} onAction={onHoverAction} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={prevMonth} className="p-1 hover:bg-muted rounded">&lt;</button>
            <span className="font-bold text-sm">{new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-muted rounded">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground mb-2">
            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-2 flex-1">
            {/* Simple Calendar Gen */}
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayObs = pendingObligations.filter(o => o.due_date.startsWith(dateStr));
              
              if (currentMonth === 1 && day > 28) return null; // Simplified leap year ignore for UI demo
              if ((currentMonth === 3 || currentMonth === 5 || currentMonth === 8 || currentMonth === 10) && day > 30) return null;

              return (
                <div key={day} className={`p-1 border rounded-lg flex flex-col items-center justify-start min-h-[40px] relative transition-all ${dayObs.length > 0 ? 'bg-primary/5 border-primary/20' : 'border-dashed border-border/50'}`}>
                  <span className="text-[10px] font-medium text-muted-foreground mb-1">{day}</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full px-1">
                    {dayObs.map((ob, idx) => (
                      <div key={idx} className={cn(
                        "w-full h-1.5 rounded-full cursor-pointer hover:scale-110 transition-transform",
                        ob.relationship === "Critical" ? "bg-destructive" :
                        ob.relationship === "Important" ? "bg-yellow-500" : "bg-primary"
                      )} title={`${ob.vendor} - ₹${ob.amount}`} onClick={() => onHoverAction('email', ob)}></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 justify-center text-[10px] font-bold text-muted-foreground uppercase">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive"></div> Critical</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Important</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> Flexible</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableItem({ obligation, index, onAction }: { obligation: Obligation; index: number; onAction: (a: 'email' | 'micropayment', o: Obligation) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: obligation.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col bg-background border border-border rounded-xl transition-all overflow-hidden",
        isDragging ? "shadow-xl border-primary scale-[1.02] bg-primary/5" : "hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3 p-3 z-10 bg-background relative">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-primary rounded z-20"
        >
          <GripVertical size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-sm truncate flex items-center gap-1.5 text-foreground">
              <Building2 size={14} className="text-muted-foreground" />
              {obligation.vendor}
            </h4>
            <span className="font-extrabold text-sm text-foreground">₹{obligation.amount.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
              <CalIcon size={12} />
              {new Date(obligation.due_date).toLocaleDateString()}
              {obligation.deferred_days > 0 && <span className="text-yellow-600 font-bold ml-1">+{obligation.deferred_days}d</span>}
            </div>

            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md",
                obligation.relationship === "Critical" ? "risk-critical" :
                obligation.relationship === "Important" ? "risk-important" : "risk-flexible"
              )}
            >
              {obligation.relationship}
            </span>
          </div>
        </div>
      </div>

      {/* Hover Action Menu Extends Downwards */}
      <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 ease-in-out bg-muted/30 border-t border-border flex items-center justify-around overflow-hidden">
         <button onClick={() => onAction('email', obligation)} className="flex-1 flex flex-col items-center justify-center p-2 text-primary hover:bg-primary/10 transition-colors">
            <Mail size={16} className="mb-0.5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Send Email</span>
         </button>
         <div className="w-px h-8 bg-border"></div>
         <button onClick={() => onAction('micropayment', obligation)} className="flex-1 flex flex-col items-center justify-center p-2 text-success hover:bg-success/10 transition-colors">
            <Coins size={16} className="mb-0.5" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Micropay</span>
         </button>
      </div>
    </div>
  );
}

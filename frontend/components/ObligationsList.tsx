"use client";

import React, { useState, useEffect } from "react";
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
  const [localPending, setLocalPending] = useState<Obligation[]>([]);
  
  // Isolate pending obligations and sync local state perfectly
  useEffect(() => {
    setLocalPending(obligations.filter((o) => o.status === "pending"));
  }, [obligations]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = localPending.findIndex((o) => o.id === active.id);
      const newIndex = localPending.findIndex((o) => o.id === over?.id);
      
      // 1. Immediately swap array visually
      const newItems = arrayMove(localPending, oldIndex, newIndex);
      setLocalPending(newItems);
      
      // 2. Fire backend sync async
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
    <div className="bg-card rounded-3xl border border-border p-5 shadow-sm h-full flex flex-col animate-in slide-in-from-left-4 duration-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-extrabold text-foreground">Upcoming Payments</h3>
          <p className="text-xs text-muted-foreground font-medium">Manage and defer liquidity liabilities</p>
        </div>
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
          <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>List</button>
          <button onClick={() => setViewMode('calendar')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Calendar</button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localPending.map(o => o.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 pb-8">
                {localPending.map((ob, idx) => (
                  <SortableItem key={ob.id} obligation={ob} index={idx} onAction={onHoverAction} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 flex flex-col animate-scale-in">
          <div className="flex justify-between items-center mb-6 px-4 bg-muted/30 py-2 rounded-xl border border-border">
            <button onClick={prevMonth} className="px-3 py-1 bg-background border border-border hover:bg-muted rounded-lg font-bold text-muted-foreground transition-colors">&lt;</button>
            <span className="font-black text-sm text-foreground uppercase tracking-widest">{new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={nextMonth} className="px-3 py-1 bg-background border border-border hover:bg-muted rounded-lg font-bold text-muted-foreground transition-colors">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-muted-foreground mb-3">
            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-2 flex-1 pb-4">
            {/* Simple Calendar Gen */}
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayObs = localPending.filter(o => o.due_date.startsWith(dateStr));
              
              if (currentMonth === 1 && day > 28) return null; 
              if ((currentMonth === 3 || currentMonth === 5 || currentMonth === 8 || currentMonth === 10) && day > 30) return null;

              return (
                <div key={day} className={`p-1 border rounded-xl flex flex-col items-center justify-start min-h-[44px] relative transition-all group ${dayObs.length > 0 ? 'bg-primary/5 border-primary/20 shadow-sm' : 'border-dashed border-border/60 bg-muted/10'}`}>
                  <span className={`text-[10px] font-bold mb-1 ${dayObs.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
                  <div className="flex flex-wrap gap-1 justify-center w-full px-1">
                    {dayObs.map((ob, idx) => (
                      <div key={`dot_${idx}`} className="relative">
                         <div className={cn(
                           "w-2 h-2 rounded-full cursor-pointer hover:scale-150 transition-transform shadow-sm",
                           ob.relationship === "Critical" ? "bg-destructive border border-destructive/50" :
                           ob.relationship === "Important" ? "bg-yellow-500 border border-yellow-600/50" : "bg-primary border border-primary/50"
                         )}></div>
                         
                         {/* Details Card on Hover */}
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 mb-2 w-48 bg-card border border-border rounded-xl shadow-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 animate-slide-up scale-95 group-hover:scale-100 hidden group-hover:block">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Assigned Liability</span>
                            <h4 className="font-extrabold text-xs text-foreground truncate">{ob.vendor}</h4>
                            <p className="text-sm font-black text-foreground mt-1 mb-2">₹{ob.amount.toLocaleString()}</p>
                            <div className="flex gap-2">
                               <button onClick={(e) => {e.stopPropagation(); onHoverAction('email', ob)}} className="flex-1 text-[9px] font-bold py-1 bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors uppercase">Email</button>
                               <button onClick={(e) => {e.stopPropagation(); onHoverAction('micropayment', ob)}} className="flex-1 text-[9px] font-bold py-1 bg-success/10 text-success border border-success/20 rounded hover:bg-success/20 transition-colors uppercase">Micropay</button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-4 justify-center text-[9px] font-black tracking-widest uppercase text-muted-foreground bg-muted/30 py-2 rounded-xl border border-border">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive shadow-sm"></div> Critical</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm"></div> Important</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm"></div> Flexible</span>
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
        "group relative flex flex-col bg-card border border-border rounded-2xl transition-all overflow-hidden cursor-pointer",
        isDragging ? "shadow-2xl border-primary scale-[1.03] bg-primary/5" : "hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-4 p-4 z-10 bg-transparent relative">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded-lg z-20 transition-colors"
        >
          <GripVertical size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-extrabold text-sm truncate flex items-center gap-1.5 text-foreground">
              <Building2 size={16} className="text-primary/70" />
              {obligation.vendor}
            </h4>
            <span className="font-black text-sm text-foreground">₹{obligation.amount.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center mt-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border border-border/50 uppercase tracking-widest">
              <CalIcon size={12} />
              {new Date(obligation.due_date).toLocaleDateString()}
              {obligation.deferred_days > 0 && <span className="text-yellow-600 ml-1">+{obligation.deferred_days}d</span>}
            </div>

            <span
              className={cn(
                "text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded-lg border",
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
      <div className="max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-300 ease-in-out bg-muted/10 border-t border-border flex items-center justify-around overflow-hidden">
         <button onClick={(e) => {e.stopPropagation(); onAction('email', obligation)}} className="flex-1 flex flex-col items-center justify-center p-3 text-primary hover:bg-primary/10 transition-colors">
            <Mail size={18} className="mb-1" />
            <span className="text-[10px] font-black tracking-widest uppercase">Send Email</span>
         </button>
         <div className="w-px h-10 bg-border"></div>
         <button onClick={(e) => {e.stopPropagation(); onAction('micropayment', obligation)}} className="flex-1 flex flex-col items-center justify-center p-3 text-success hover:bg-success/10 transition-colors">
            <Coins size={18} className="mb-1" />
            <span className="text-[10px] font-black tracking-widest uppercase">Micropay</span>
         </button>
      </div>
    </div>
  );
}

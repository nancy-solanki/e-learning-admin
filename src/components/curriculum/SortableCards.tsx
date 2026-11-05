import type { ReactNode } from 'react';
import { useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function Card({
  id,
  title,
  disabled,
  children,
}: {
  id: string;
  title: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm focus-within:z-10 hover:border-violet-200 motion-reduce:transition-none ${isDragging ? 'z-20 border-violet-400 shadow-xl' : 'border-slate-200'}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Reorder ${title}`}
        className="touch-none cursor-grab active:cursor-grabbing rounded-lg px-2 py-3 text-xl text-slate-400 hover:bg-violet-50 hover:text-violet-600 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:opacity-30"
      >
        ⠿
      </button>
      {children}
    </li>
  );
}

export function SortableCards<T extends { id: string; title: string }>({
  items,
  onReorder,
  disabled = false,
  renderItem,
  label,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
  label: string;
}) {
  const keyboardTargetIndex = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, args) => {
        if (event.code !== 'ArrowDown' && event.code !== 'ArrowUp') {
          return sortableKeyboardCoordinates(event, args);
        }

        const { active, context } = args;
        const activeIndex = items.findIndex((item) => item.id === active);
        if (activeIndex < 0) return;
        const currentIndex = keyboardTargetIndex.current ?? activeIndex;
        const direction = event.code === 'ArrowDown' ? 1 : -1;
        const targetIndex = Math.max(
          0,
          Math.min(items.length - 1, currentIndex + direction),
        );
        keyboardTargetIndex.current = targetIndex;
        const target = items[targetIndex];
        const rect = target && context.droppableRects.get(target.id);
        if (!rect) return;

        return { x: rect.left, y: rect.top };
      },
      scrollBehavior: 'auto',
    }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        keyboardTargetIndex.current = null;
      }}
      onDragCancel={() => {
        keyboardTargetIndex.current = null;
      }}
      onDragEnd={({ active, over }) => {
        const keyboardTarget = keyboardTargetIndex.current;
        keyboardTargetIndex.current = null;
        if (disabled) return;

        const from = items.findIndex((item) => item.id === active.id);
        const to =
          keyboardTarget ??
          (over ? items.findIndex((item) => item.id === over.id) : -1);
        if (from >= 0 && to >= 0 && from !== to)
          onReorder(arrayMove(items, from, to));
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="grid gap-3">
          {items.map((item, index) => (
            <Card
              key={item.id}
              id={item.id}
              title={item.title}
              disabled={disabled}
            >
              {renderItem(item, index)}
            </Card>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

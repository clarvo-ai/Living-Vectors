'use client';

import type { Learning } from '@/app/api/learnings/route';
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface Criterion {
  id?: string;
  criteriaText: string;
  priority: number;
}

interface SortableCriterionProps {
  criterion: Criterion;
  index: number;
  onUpdate: (index: number, text: string) => void;
  onRemove: (index: number) => void;
}

interface AddCriterionButtonProps {
  onClick: () => void;
  label?: string;
}

interface EmptyCriteriaStateProps {
  onAddFirst: () => void;
}

interface SortableCriteriaListProps {
  criteria: Criterion[];
  sensors: Parameters<typeof DndContext>[0]['sensors'];
  onDragEnd: (event: DragEndEvent) => void;
  onUpdate: (index: number, text: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

function SortableCriterion({ criterion, index, onUpdate, onRemove }: SortableCriterionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: criterion.id || `criterion-${index}`,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      if (scrollHeight > 40) {
        textareaRef.current.style.height = `${scrollHeight}px`;
      }
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [criterion.criteriaText, autoResize]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        boxShadow: isDragging ? '0 8px 20px rgba(0, 0, 0, 0.12)' : 'none',
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        style={{
          width: 28,
          height: 28,
          border: 'none',
          background: 'transparent',
          color: '#6b7280',
          cursor: 'grab',
          fontSize: 18,
        }}
      >
        ⠿
      </button>

      <div
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          flexShrink: 0,
        }}
      >
        {criterion.priority}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          ref={textareaRef}
          value={criterion.criteriaText}
          onChange={(e) => onUpdate(index, e.target.value)}
          placeholder="Enter a criterion..."
          onInput={autoResize}
          style={{
            width: '100%',
            minHeight: 40,
            height: 40,
            resize: 'none',
            overflow: 'hidden',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: '8px 10px',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.4,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        title="Delete criterion"
        style={{
          border: 'none',
          background: 'transparent',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: 18,
          width: 28,
          height: 28,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function AddCriterionButton({ onClick, label = 'Add Criterion' }: AddCriterionButtonProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          border: '1px solid #d1d5db',
          borderRadius: 8,
          background: '#ffffff',
          color: '#374151',
          padding: '8px 12px',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        + {label}
      </button>
    </div>
  );
}

function EmptyCriteriaState({ onAddFirst }: EmptyCriteriaStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        border: '1px dashed #d1d5db',
        borderRadius: 12,
        padding: '30px 16px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: 18 }}>Add Your Evaluation Criteria</h3>
      <p style={{ marginTop: 8, marginBottom: 16, color: '#6b7280', maxWidth: 540 }}>
        Define specific criteria to evaluate candidates more accurately. Add requirements like
        skills, experience levels, or qualifications.
      </p>
      <AddCriterionButton onClick={onAddFirst} label="Add Your First Criterion" />
    </div>
  );
}

function SortableCriteriaList({
  criteria,
  sensors,
  onDragEnd,
  onUpdate,
  onRemove,
  onAdd,
}: SortableCriteriaListProps) {
  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <SortableContext
          items={criteria.map((c, i) => c.id || `criterion-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {criteria.map((criterion, index) => (
              <SortableCriterion
                key={criterion.id || `criterion-${index}`}
                criterion={criterion}
                index={index}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddCriterionButton onClick={onAdd} />
    </div>
  );
}

export default function EditPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [userClickedAddFirstCriteria, setUserClickedAddFirstCriteria] = useState(false);
  const [learningsLoading, setLearningsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learnings')
      .then((res) => res.json())
      .then((data) => {
        if (data.body && Array.isArray(data.body)) {
          setCriteria(
            (data.body as Learning[]).map((learning, index) => ({
              id: learning.id,
              criteriaText: learning.summary,
              priority: index + 1,
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLearningsLoading(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCriteria((items) => {
        const oldIndex = items.findIndex(
          (item) => (item.id || `criterion-${items.indexOf(item)}`) === active.id
        );
        const newIndex = items.findIndex(
          (item) => (item.id || `criterion-${items.indexOf(item)}`) === over.id
        );

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({
          ...item,
          priority: index + 1,
        }));
      });
    }
  }, []);

  const handleUpdateCriterion = useCallback((index: number, text: string) => {
    setCriteria((prev) =>
      prev.map((criterion, i) => (i === index ? { ...criterion, criteriaText: text } : criterion))
    );
  }, []);

  const handleRemoveCriterion = useCallback((index: number) => {
    setCriteria((prev) => {
      const newCriteria = prev.filter((_, i) => i !== index);
      return newCriteria.map((criterion, i) => ({
        ...criterion,
        priority: i + 1,
      }));
    });
  }, []);

  const handleAddCriterion = useCallback(() => {
    if (criteria.length === 0) {
      setUserClickedAddFirstCriteria(true);
    }
    const newPriority = criteria.length + 1;
    setCriteria((prev) => [
      ...prev,
      {
        criteriaText: '',
        priority: newPriority,
      },
    ]);
  }, [criteria.length]);

  const title = useMemo(
    () =>
      userClickedAddFirstCriteria || criteria.length === 0
        ? 'Set Up Evaluation Criteria'
        : 'Do these criteria match your search?',
    [criteria.length, userClickedAddFirstCriteria]
  );

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '24px auto',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#f9fafb',
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 22, fontWeight: 600 }}>{title}</h2>

      {learningsLoading ? (
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
      ) : criteria.length === 0 ? (
        <EmptyCriteriaState onAddFirst={handleAddCriterion} />
      ) : (
        <SortableCriteriaList
          criteria={criteria}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onUpdate={handleUpdateCriterion}
          onRemove={handleRemoveCriterion}
          onAdd={handleAddCriterion}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          type="button"
          disabled={criteria.length === 0 || criteria.some((c) => !c.criteriaText.trim())}
          style={{
            border: 'none',
            borderRadius: 8,
            background: '#2563eb',
            color: '#ffffff',
            padding: '10px 14px',
            fontSize: 14,
            cursor: 'pointer',
            opacity:
              criteria.length === 0 || criteria.some((c) => !c.criteriaText.trim()) ? 0.6 : 1,
          }}
        >
          Confirm &amp; Start Evaluation
        </button>
      </div>
    </div>
  );
}

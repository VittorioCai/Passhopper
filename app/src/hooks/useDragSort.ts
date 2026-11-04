import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

interface Drag {
  index: number;
  startY: number;
  dy: number;
  /** Top, height of every item when the drag began, in page coordinates. */
  boxes: { top: number; height: number }[];
  scroll0: number;
}

/** Where the dragged item would land, given how far it has moved. */
export function dropIndex(
  boxes: { top: number; height: number }[],
  index: number,
  dy: number,
  min: number,
) {
  const center = boxes[index]!.top + boxes[index]!.height / 2 + dy;
  let to = index;
  for (let i = 0; i < boxes.length; i++) {
    if (i === index || i < min) continue;
    const mid = boxes[i]!.top + boxes[i]!.height / 2;
    if (i < index && center < mid) to = Math.min(to, i);
    if (i > index && center > mid) to = Math.max(to, i);
  }
  return to;
}

/**
 * Drag to reorder a list with a handle (F1.1). Works with mouse and touch, scrolls the page near
 * the edges, and the handle also takes arrow keys. Items before `min` stay put (the trip's start).
 * Each item needs `data-drag-item` on its element inside `container`.
 */
export function useDragSort(onMove: (from: number, to: number) => void, min = 0) {
  const container = useRef<HTMLElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointerY = useRef(0);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  // Scroll the page while the pointer is near the top or bottom edge.
  useEffect(() => {
    if (!drag) return;
    let frame = 0;
    const tick = () => {
      const y = pointerY.current;
      const edge = 70;
      const speed =
        y < edge ? -(edge - y) / 4 : y > innerHeight - edge ? (y - (innerHeight - edge)) / 4 : 0;
      if (speed) {
        scrollBy(0, speed);
        const d = dragRef.current;
        if (d) setDrag({ ...d, dy: y - d.startY + (scrollY - d.scroll0) });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const indexOf = (el: HTMLElement) => Number(el.dataset.dragIndex);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !container.current) return;
    e.preventDefault();
    const index = indexOf(e.currentTarget);
    const items = [...container.current.querySelectorAll<HTMLElement>('[data-drag-item]')];
    const boxes = items.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerY.current = e.clientY;
    setDrag({ index, startY: e.clientY, dy: 0, boxes, scroll0: scrollY });
  }, []);
  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d) return;
    pointerY.current = e.clientY;
    setDrag({ ...d, dy: e.clientY - d.startY + (scrollY - d.scroll0) });
  }, []);
  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    setDrag(null);
    if (!d) return;
    const to = dropIndex(d.boxes, d.index, d.dy, min);
    if (to !== d.index) onMove(d.index, to);
  }, [min, onMove]);
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const index = indexOf(e.currentTarget);
      const count = Number(e.currentTarget.dataset.dragCount);
      if (e.key === 'ArrowUp' && index > min) {
        e.preventDefault();
        onMove(index, index - 1);
      } else if (e.key === 'ArrowDown' && index < count - 1) {
        e.preventDefault();
        onMove(index, index + 1);
      }
    },
    [min, onMove],
  );

  /** Props for the drag handle of item `index` out of `count`. */
  const handle = (index: number, count: number) => ({
    'data-drag-index': index,
    'data-drag-count': count,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onKeyDown,
    style: { touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' } as CSSProperties,
  });

  /** Inline style that moves item `index` while dragging. */
  const itemStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    if (index === drag.index)
      return {
        transform: `translateY(${drag.dy}px)`,
        zIndex: 5,
        position: 'relative',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: 'var(--r-md)',
        background: 'var(--bg)',
      };
    const to = dropIndex(drag.boxes, drag.index, drag.dy, min);
    const h = drag.boxes[drag.index]!.height;
    const shift =
      drag.index < to && index > drag.index && index <= to
        ? -h
        : drag.index > to && index < drag.index && index >= to
          ? h
          : 0;
    return shift
      ? { transform: `translateY(${shift}px)`, transition: 'transform 0.15s' }
      : { transition: 'transform 0.15s' };
  };

  /** Pass as `ref` to the list element. */
  const bindList = useCallback((el: HTMLElement | null) => {
    container.current = el;
  }, []);

  return { bindList, handle, itemStyle, dragging: drag !== null };
}

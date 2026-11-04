import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import ui from './ui.module.css';

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 60,
  label,
  format = String,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  format?: (v: number) => string;
}) {
  return (
    <span className={ui.stepper} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`${label} −1`}
      >
        <MinusIcon size={16} weight="bold" />
      </button>
      <span aria-live="polite">{format(value)}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`${label} +1`}
      >
        <PlusIcon size={16} weight="bold" />
      </button>
    </span>
  );
}

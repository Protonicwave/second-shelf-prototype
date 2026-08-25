import type { ReactElement, ReactNode } from 'react';
import './primitives.css';

type ChipTone = 'ticket' | 'slate' | 'quiet';

interface ChipProps {
  readonly tone?: ChipTone;
  readonly children: ReactNode;
}

const TONE_CLASS: Readonly<Record<ChipTone, string>> = {
  ticket: 'chip',
  slate: 'chip chip-slate',
  quiet: 'chip chip-quiet',
};

/** A small inline badge carrying a value or a status, never colour alone. */
export const Chip = ({ tone = 'ticket', children }: ChipProps): ReactElement => (
  <span className={TONE_CLASS[tone]}>{children}</span>
);

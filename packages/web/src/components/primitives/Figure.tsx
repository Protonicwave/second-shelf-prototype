import type { ReactElement, ReactNode } from 'react';
import './primitives.css';

interface FigureProps {
  readonly label: string;
  readonly value: string;
  readonly children: ReactNode;
}

/** One headline metric: its caption, its number and the line that qualifies it. */
export const Figure = ({ label, value, children }: FigureProps): ReactElement => (
  <div className="fig">
    <div className="fig-label">{label}</div>
    <div className="fig-value">{value}</div>
    <div className="fig-sub">{children}</div>
  </div>
);

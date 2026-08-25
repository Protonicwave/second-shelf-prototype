import type { ReactElement, ReactNode } from 'react';
import './primitives.css';

interface EyebrowProps {
  readonly children: ReactNode;
}

/** The small mono caption that sits above a headline. */
export const Eyebrow = ({ children }: EyebrowProps): ReactElement => (
  <div className="eyebrow">{children}</div>
);

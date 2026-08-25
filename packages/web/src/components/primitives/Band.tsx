import type { ReactElement, ReactNode } from 'react';
import './primitives.css';

interface BandProps {
  readonly id?: string;
  readonly children: ReactNode;
}

/** A ruled full width section with the page gutter and vertical rhythm applied. */
export const Band = ({ id, children }: BandProps): ReactElement => (
  <section className="band" {...(id === undefined ? {} : { id })}>
    <div className="wrap band-inner">{children}</div>
  </section>
);

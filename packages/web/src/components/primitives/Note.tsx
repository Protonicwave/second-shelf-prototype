import type { ReactElement, ReactNode } from 'react';
import './primitives.css';

interface NoteProps {
  readonly children: ReactNode;
}

/** Quiet supporting prose, set narrow and one step down from body copy. */
export const Note = ({ children }: NoteProps): ReactElement => <p className="note">{children}</p>;

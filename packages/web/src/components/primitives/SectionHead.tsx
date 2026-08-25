import type { ReactElement, ReactNode } from 'react';
import { Eyebrow } from './Eyebrow';
import './primitives.css';

interface SectionHeadProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: ReactNode;
}

/** The two column section opener: caption and headline left, standfirst right. */
export const SectionHead = ({ eyebrow, title, lede }: SectionHeadProps): ReactElement => (
  <div className="sec-head">
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
    </div>
    <p className="lede">{lede}</p>
  </div>
);

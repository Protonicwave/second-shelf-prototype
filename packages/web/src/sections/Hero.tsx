import type { ReactElement } from 'react';
import { CATALOGUE, DEFAULT_DAY_COUNT } from '@secondshelf/domain';
import { Eyebrow } from '../components/primitives';
import './sections.css';

/** The opening statement: what the problem is and what this page is showing. */
export const Hero = (): ReactElement => (
  <section className="wrap hero">
    <Eyebrow>UK grocery &middot; in-store fresh waste</Eyebrow>
    <h1>
      Most food thrown away by a supermarket is a <em>timing</em> problem.
    </h1>
    <p className="lede">
      Stores already discount short-dated stock. They just do it too late, at the same flat rate, on
      every line. This engine reads stock, shelf life and sell-through, then works out when to
      reduce a product and by how much. It is the part that has to exist before anything else does.
    </p>
    <div className="byline">
      <span>
        <b>Built by</b> Shlok Bhusal
      </span>
      <span>
        <b>Store</b> {CATALOGUE.length} fresh lines, one superstore
      </span>
      <span>
        <b>Period</b> {DEFAULT_DAY_COUNT} trading days
      </span>
      <span>
        <b>Data</b> simulated, assumptions below
      </span>
    </div>
  </section>
);

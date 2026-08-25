import type { ReactElement } from 'react';
import { Band, Note, SectionHead } from '../components/primitives';
import './sections.css';

interface Node {
  readonly kind: string;
  readonly name: string;
  readonly status: string;
  readonly live: boolean;
  readonly core: boolean;
  readonly detail: string;
}

const NODES: readonly Node[] = [
  {
    kind: 'Input',
    name: 'Stock and shelf life',
    status: 'Simulated',
    live: false,
    core: false,
    detail:
      'In a store this comes from the stock file and the date-code scan. A nightly feed is the minimum. Hourly is what makes it useful.',
  },
  {
    kind: 'Core',
    name: 'Markdown engine',
    status: 'Running here',
    live: true,
    core: true,
    detail:
      'A pure function, no state, no dependencies. The same code runs in the browser and behind an API, which is why this page needs no server.',
  },
  {
    kind: 'Output',
    name: 'Colleague handset',
    status: 'Running here',
    live: true,
    core: false,
    detail:
      'A list and a confirmation. The only part of the system a store colleague ever touches, and the part that decides whether any of it works.',
  },
  {
    kind: 'Output',
    name: 'Till and shelf edge',
    status: 'Not built',
    live: false,
    core: false,
    detail:
      'The real obstacle. Price changes have to land at the till and on the label, which means EPOS integration and, ideally, electronic shelf labels.',
  },
];

/** The honest map of what a real deployment touches and what exists today. */
export const Integration = (): ReactElement => (
  <Band>
    <SectionHead
      eyebrow="Honest about the hard part"
      title="The engine is the easy half."
      lede="A price that never reaches the till is worth nothing. This is what a real deployment has to touch, and what this prototype actually does today."
    />
    <div className="int-grid">
      {NODES.map((node) => (
        <div className={node.core ? 'node core' : 'node'} key={node.name}>
          <div className="node-k">{node.kind}</div>
          <div className="node-n">{node.name}</div>
          <span className={node.live ? 'stat live' : 'stat stub'}>{node.status}</span>
          <div className="node-d">{node.detail}</div>
        </div>
      ))}
    </div>
    <Note>
      Nothing here claims a till integration exists. It does not. The point of a prototype is to
      prove the decision layer is right before anyone spends six months negotiating access to the
      layer that is hard.
    </Note>
  </Band>
);

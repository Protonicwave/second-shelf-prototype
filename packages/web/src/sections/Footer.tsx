import type { ReactElement } from 'react';
import { CATALOGUE } from '@secondshelf/domain';
import './sections.css';

/** What is real, where the numbers come from, and who wrote it. */
export const Footer = (): ReactElement => (
  <footer className="wrap site-foot">
    <div className="foot-grid">
      <div>
        <div className="foot-h">What is real</div>
        <p>
          The engine, the search over reductions and the policy comparison are real code, and run
          live in your browser on this page. The store, the {CATALOGUE.length} lines and the demand
          are simulated from a fixed seed, so every reload gives the same numbers.
        </p>
      </div>
      <div>
        <div className="foot-h">Sources</div>
        <ul>
          <li>WRAP, Food Surplus and Waste in the UK, for retail waste tonnage and value</li>
          <li>WRAP conversion factors for CO&#8322;e per tonne of food waste</li>
          <li>
            Category price sensitivity taken from published grocery pricing work, then exposed as a
            control rather than buried in the code
          </li>
        </ul>
      </div>
      <div>
        <div className="foot-h">Built by</div>
        <p>
          Shlok Bhusal. Full stack. TypeScript throughout, tested engine, no dependencies in the
          pricing logic.
        </p>
        <p>Built as a working answer to the problem, not as a pitch.</p>
        <p>
          <a
            className="foot-link"
            href="https://github.com/Protonicwave/second-shelf-prototype"
            rel="noreferrer"
          >
            Read the code on GitHub
          </a>
        </p>
      </div>
    </div>
  </footer>
);

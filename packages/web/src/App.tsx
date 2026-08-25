import type { ReactElement } from 'react';
import { DEFAULT_DAY_COUNT } from '@secondshelf/domain';
import { formatPounds } from './lib/format';
import { useSimulation } from './state/useSimulation';
import './styles/tokens.css';
import './styles/base.css';
import './App.css';

const Masthead = (): ReactElement => (
  <header className="masthead">
    <div className="wrap row">
      <div className="brand">
        <span className="ticket-mark">REDUCED</span>
        <span className="brand-name">Markdown Engine</span>
      </div>
      <div className="masthead-meta">
        Prototype &middot; simulated store &middot; {DEFAULT_DAY_COUNT} days
      </div>
    </div>
  </header>
);

const SiteFooter = (): ReactElement => (
  <footer className="wrap">
    <div className="foot-grid">
      <div>
        <div className="foot-h">What is real</div>
        <p>
          The engine, the search over reductions and the policy comparison are real code, and run
          live in your browser on this page. The store, the 24 lines and the demand are simulated
          from a fixed seed, so every reload gives the same numbers.
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
      </div>
    </div>
  </footer>
);

interface AssumptionsRailProps {
  readonly recoveredPence: number | null;
  readonly pending: boolean;
}

/*
 * The rail is mounted here so the layout reserves its height from the first
 * paint. The three controls that fill it arrive with the page sections.
 */
const AssumptionsRail = ({ recoveredPence, pending }: AssumptionsRailProps): ReactElement => (
  <div className="assume">
    <div className="wrap assume-in">
      <div className="assume-lab">
        Assumptions
        <br />
        you can argue with
      </div>
      <div className="assume-out">
        <div className="k">Recovered, {DEFAULT_DAY_COUNT} days</div>
        <div className="v" aria-live="polite" aria-busy={pending}>
          {recoveredPence === null ? 'Working' : formatPounds(recoveredPence)}
        </div>
      </div>
    </div>
  </div>
);

/** The page frame. Sections mount inside the main region as they are built. */
export const App = (): ReactElement => {
  const simulation = useSimulation();
  const recoveredPence =
    simulation.metrics === null ? null : simulation.metrics.valueRecoveredPence;

  return (
    <>
      <Masthead />
      <main id="main" />
      <SiteFooter />
      <AssumptionsRail recoveredPence={recoveredPence} pending={simulation.pending} />
    </>
  );
};

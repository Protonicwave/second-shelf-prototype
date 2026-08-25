import type { ReactElement } from 'react';
import { DEFAULT_DAY_COUNT } from '@secondshelf/domain';
import {
  AssumptionsBar,
  Decision,
  Figures,
  FloorView,
  Footer,
  Hero,
  Integration,
  LineTable,
  PolicyChart,
} from './sections';
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

/** The whole page. One run drives every section on it. */
export const App = (): ReactElement => {
  const { assumptions, run, metrics, pending, error, setAssumptions } = useSimulation();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the content
      </a>
      <Masthead />
      <main id="main">
        <Hero />
        <Figures metrics={metrics} />
        <PolicyChart days={run?.days ?? []} />
        <Decision assumptions={assumptions} />
        <LineTable lines={run?.lines ?? []} dayCount={run?.dayCount ?? DEFAULT_DAY_COUNT} />
        <FloorView lines={run?.lines ?? []} />
        <Integration />
      </main>
      <Footer />
      <AssumptionsBar
        assumptions={assumptions}
        recoveredPence={metrics?.valueRecoveredPence ?? null}
        pending={pending}
        error={error}
        onChange={setAssumptions}
      />
    </>
  );
};

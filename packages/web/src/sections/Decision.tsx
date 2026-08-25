import { useMemo, type ReactElement } from 'react';
import { CATALOGUE } from '@secondshelf/domain';
import {
  explainPlan,
  NO_MARKDOWN_PLAN,
  searchBestPlan,
  simulateLineDay,
  type Assumptions,
  type DaySettings,
  type EvaluatedOption,
} from '@secondshelf/engine';
import { Band, SectionHead } from '../components/primitives';
import { formatPlan, formatPounds } from '../lib/format';
import './sections.css';

/** The line the worked example follows, chosen because it is life constrained. */
const EXAMPLE_LINE_ID = 'british-chicken-thighs-1kg';

/** A single ordinary trading day, so the example is readable and repeatable. */
const EXAMPLE_DAY: DaySettings = { stockUnits: 24, demandMultiplier: 1 };

/** How many alternatives sit under the winner. More than this stops being readable. */
const SHOWN_OPTIONS = 8;

const EXAMPLE_LINE = CATALOGUE.find((line) => line.id === EXAMPLE_LINE_ID);
if (EXAMPLE_LINE === undefined) {
  throw new Error(`The catalogue no longer carries ${EXAMPLE_LINE_ID}.`);
}
const LINE = EXAMPLE_LINE;

interface DecisionProps {
  readonly assumptions: Assumptions;
}

interface ExamplePanel {
  readonly options: readonly EvaluatedOption[];
  readonly explanation: string;
}

const byNetValue = (a: EvaluatedOption, b: EvaluatedOption): number =>
  b.outcome.netValuePence - a.outcome.netValuePence;

const buildPanel = (assumptions: Assumptions): ExamplePanel => {
  const search = searchBestPlan(LINE, assumptions, EXAMPLE_DAY);
  const noChange: EvaluatedOption = {
    plan: NO_MARKDOWN_PLAN,
    outcome: simulateLineDay(LINE, NO_MARKDOWN_PLAN, assumptions, EXAMPLE_DAY),
  };

  const seen = new Set<string>();
  const options: EvaluatedOption[] = [];
  for (const option of [search.best, noChange, ...search.rankedSingleStage]) {
    const label = formatPlan(option.plan);
    if (seen.has(label)) continue;
    seen.add(label);
    options.push(option);
    if (options.length === SHOWN_OPTIONS) break;
  }
  options.sort(byNetValue);

  return { options, explanation: explainPlan(LINE, search.best.plan, EXAMPLE_DAY) };
};

/** The three step explanation, and the real search that sits underneath it. */
export const Decision = ({ assumptions }: DecisionProps): ReactElement => {
  const { options, explanation } = useMemo(() => buildPanel(assumptions), [assumptions]);

  const values = options.map((option) => option.outcome.netValuePence);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const spread = highest - lowest || 1;

  return (
    <Band>
      <SectionHead
        eyebrow="The decision"
        title="Three steps, and no black box."
        lede="A category manager will not sign off a number they cannot argue with. Every reduction here traces back to the stock on hand, the hours left, and the demand the engine expected to buy with the discount."
      />

      <div className="steps">
        <div className="step">
          <div className="step-n">STEP 01</div>
          <h3>Read the state</h3>
          <p>
            Stock on hand, hours until the line must come off sale, sell-through so far today, and
            what this product normally does at this hour on this weekday.
          </p>
        </div>
        <div className="step">
          <div className="step-n">STEP 02</div>
          <h3>Price every option</h3>
          <p>
            For each possible reduction, and each hour it could start, estimate the units sold
            before expiry. Then value it: revenue earned, less margin given away, less the cost of
            what still goes in the bin.
          </p>
        </div>
        <div className="step">
          <div className="step-n">STEP 03</div>
          <h3>Take the best one</h3>
          <p>
            Pick the option worth most, and give the reason in one line. If nothing beats leaving
            the price alone, the engine leaves the price alone.
          </p>
        </div>
      </div>

      <div className="example">
        <div className="ex-head">
          <div className="ex-title">{LINE.name}</div>
          <div className="ex-meta">
            {EXAMPLE_DAY.stockUnits} units at open &middot; {LINE.saleableHoursAtOpen} hours of
            saleable life &middot; {formatPounds(LINE.fullPricePence, 2)} full price
          </div>
        </div>
        <div className="ev-rows">
          {options.map((option, index) => {
            const width = Math.max(3, ((option.outcome.netValuePence - lowest) / spread) * 100);
            return (
              <div className={index === 0 ? 'ev best' : 'ev'} key={formatPlan(option.plan)}>
                <span className="ev-d">
                  {formatPlan(option.plan)}
                  {index === 0 ? ' · best' : ''}
                </span>
                <span className="ev-bar">
                  <span className="ev-fill" style={{ width: `${width.toFixed(1)}%` }} />
                </span>
                <span className="ev-v">{formatPounds(option.outcome.netValuePence, 2)}</span>
              </div>
            );
          })}
        </div>
        <p className="ex-foot">
          {explanation} Deeper is not better. Earlier usually is, because a smaller reduction held
          for longer gives away less margin per unit than a half price sticker at six o&#39;clock.
        </p>
      </div>
    </Band>
  );
};

import type { ReactElement } from 'react';
import { CATALOGUE, type LineAggregate } from '@secondshelf/domain';
import type { ProductLine } from '@secondshelf/engine';
import { Band, SectionHead } from '../components/primitives';
import { formatPounds, roundToLabelPrice } from '../lib/format';
import './sections.css';

/** The hour the round is walked, 17:00, as an index from open. */
const FLOOR_HOUR_INDEX = 10;

/** How many lines fit on a handset screen without scrolling. */
const PICK_COUNT = 5;

/** The share of remaining stock treated as at risk in the hour ahead. */
const AT_RISK_SHARE = 0.3;

const CATALOGUE_BY_ID = new Map(CATALOGUE.map((line) => [line.id, line]));

interface Pick {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
  readonly category: string;
  readonly fullPricePence: number;
  readonly reducedPence: number;
  readonly valueAtRiskPence: number;
}

const liveReduction = (aggregate: LineAggregate): number | null => {
  let reduction: number | null = null;
  for (const stage of aggregate.samplePlan) {
    if (stage.hour <= FLOOR_HOUR_INDEX) reduction = stage.reduction;
  }
  return reduction;
};

const toPick = (aggregate: LineAggregate, line: ProductLine): Pick | null => {
  const reduction = liveReduction(aggregate);
  if (reduction === null) return null;
  const atRisk = Math.max(4, aggregate.meanStockUnits * AT_RISK_SHARE);
  return {
    id: aggregate.lineId,
    name: aggregate.name,
    category: aggregate.category,
    reason:
      line.saleableHoursAtOpen - FLOOR_HOUR_INDEX <= 1
        ? 'off sale at 22:00'
        : 'selling under forecast',
    fullPricePence: line.fullPricePence,
    reducedPence: roundToLabelPrice(line.fullPricePence * (1 - reduction)),
    valueAtRiskPence: line.fullPricePence * atRisk,
  };
};

/**
 * Returns what the colleague should reduce next, most value at risk first, so a
 * round cut short leaves the cheapest things to lose undone.
 */
const buildPicks = (lines: readonly LineAggregate[]): readonly Pick[] => {
  const picks: Pick[] = [];
  for (const aggregate of lines) {
    const line = CATALOGUE_BY_ID.get(aggregate.lineId);
    if (line === undefined) continue;
    const pick = toPick(aggregate, line);
    if (pick !== null) picks.push(pick);
  }
  picks.sort((a, b) => b.valueAtRiskPence - a.valueAtRiskPence);
  return picks.slice(0, PICK_COUNT);
};

interface FloorViewProps {
  readonly lines: readonly LineAggregate[];
}

/** The colleague handset: the same decision, in the shape a label gun needs. */
export const FloorView = ({ lines }: FloorViewProps): ReactElement => {
  const picks = buildPicks(lines);
  const atRisk = picks.reduce((total, pick) => total + pick.valueAtRiskPence, 0);

  return (
    <Band>
      <SectionHead
        eyebrow="On the shop floor"
        title="The output has to fit in one hand."
        lede="Markdown systems do not fail on the maths. They fail because someone with a label gun and forty minutes ignores them. So the engine ends at a list, sorted, with the reason attached, readable while walking."
      />

      <div className="floor-grid">
        <div className="floor-copy">
          <p>
            The colleague never sees an elasticity curve. They see the aisle, the product, the new
            price, and one line saying why now rather than later.
          </p>
          <p>
            Order matters more than it looks. The list is sorted by value at risk in the next hour,
            so if the round gets cut short, the cheapest things to lose are the ones left undone.
          </p>
          <p>
            Prices round to the shapes a label gun and a shopper both expect. A reduction to
            &pound;2.63 is correct and useless.
          </p>
          <p>
            Anything the colleague overrides gets recorded. That disagreement is the most valuable
            training data in the building, and it costs nothing to collect.
          </p>
        </div>
        <div className="handset">
          <div className="hs-top">
            <div className="hs-time">Tuesday &middot; 17:00</div>
            <div className="hs-h">Reduce now</div>
            <div className="hs-sub">
              {picks.length} lines &middot; {formatPounds(atRisk)} at risk before close
            </div>
          </div>
          <ul className="picks">
            {picks.map((pick) => (
              <li className="pick" key={pick.id}>
                <div className="pick-body">
                  <div className="pick-n">{pick.name}</div>
                  <div className="pick-m">
                    {pick.category} &middot; {pick.reason}
                  </div>
                </div>
                <div className="pick-price">
                  <div className="was">
                    <span className="visually-hidden">Was </span>
                    {formatPounds(pick.fullPricePence, 2)}
                  </div>
                  <div className="now">
                    <span className="visually-hidden">Now </span>
                    {formatPounds(pick.reducedPence, 2)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Band>
  );
};

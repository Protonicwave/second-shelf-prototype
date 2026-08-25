import { memo, type ReactElement } from 'react';
import type { CumulativePoint } from '@secondshelf/domain';
import { Band, Note, SectionHead } from '../components/primitives';
import { formatPounds } from '../lib/format';
import './sections.css';

const WIDTH = 1000;
const HEIGHT = 340;
/*
 * The left gutter carries the gridline values and the right one carries the
 * two series labels. Keeping them apart is what stops a line that finishes
 * near a gridline from printing its name over the value.
 */
const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 94;
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 34;
const GRIDLINES = 4;

/** The gridline interval, in pence. One thousand pounds reads well at this scale. */
const STEP_PENCE = 100_000;

/** The day the annotation points at, where the two policies have clearly parted. */
const ANNOTATION_DAY_INDEX = 8;

const ANNOTATION_LINES = [
  'The engine pulls away once it starts',
  'reducing before the evening rush',
] as const;

/** Rough advance of the annotation type, in user units per character. */
const ANNOTATION_CHAR_WIDTH = 7;

const innerWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const innerHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

interface PolicyChartProps {
  readonly days: readonly CumulativePoint[];
}

const axisIndices = (count: number): readonly number[] => {
  const last = count - 1;
  const candidates = [0, Math.round(last / 3), Math.round((last * 2) / 3), last];
  return candidates.filter((value, index) => candidates.indexOf(value) === index);
};

const ChartView = ({ days }: PolicyChartProps): ReactElement | null => {
  const count = days.length;
  const last = days[count - 1];
  if (count < 2 || last === undefined) return null;

  let peak = 0;
  for (const point of days) {
    if (point.enginePence > peak) peak = point.enginePence;
    if (point.currentPence > peak) peak = point.currentPence;
  }
  const ceiling = Math.max(STEP_PENCE, Math.ceil(peak / STEP_PENCE) * STEP_PENCE);

  const x = (index: number): number => MARGIN_LEFT + (innerWidth * index) / (count - 1);
  const y = (pence: number): number => MARGIN_TOP + innerHeight - (innerHeight * pence) / ceiling;

  const path = (pick: (point: CumulativePoint) => number): string =>
    days
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(pick(point)).toFixed(1)}`,
      )
      .join('');

  const annotationIndex = Math.min(ANNOTATION_DAY_INDEX, count - 1);
  const annotation = days[annotationIndex] ?? last;

  /*
   * The engine line only climbs, so text placed above it at the day the
   * annotation points to is crossed further along. Clear the line at the far
   * end of the text instead, and keep it inside the top margin.
   */
  const annotationX = x(annotationIndex) + 9;
  const annotationWidth =
    Math.max(...ANNOTATION_LINES.map((entry) => entry.length)) * ANNOTATION_CHAR_WIDTH;
  const spanIndex = Math.min(
    count - 1,
    Math.ceil(((annotationX + annotationWidth - MARGIN_LEFT) * (count - 1)) / innerWidth),
  );
  const spanPoint = days[spanIndex] ?? last;
  const annotationBase = Math.max(
    MARGIN_TOP + 26,
    Math.min(y(annotation.enginePence), y(spanPoint.enginePence)) - 12,
  );

  const description =
    `Cumulative value recovered against no markdown over ${count} trading days. ` +
    `The engine ends at ${formatPounds(last.enginePence)} and the current policy at ` +
    `${formatPounds(last.currentPence)}. No markdown is the flat zero line.`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={description}>
      {Array.from({ length: GRIDLINES + 1 }, (_unused, tick) => {
        const value = (ceiling * tick) / GRIDLINES;
        const at = y(value).toFixed(1);
        return (
          <g key={tick}>
            <line
              x1={MARGIN_LEFT}
              x2={MARGIN_LEFT + innerWidth}
              y1={at}
              y2={at}
              stroke={tick === 0 ? 'rgba(18,21,15,.26)' : 'rgba(18,21,15,.07)'}
              strokeWidth={1}
            />
            <text className="axis-t" x={MARGIN_LEFT - 12} y={y(value) + 3.5} textAnchor="end">
              {formatPounds(value)}
            </text>
          </g>
        );
      })}

      {axisIndices(count).map((index) => (
        <text
          key={index}
          className="axis-t"
          x={x(index).toFixed(1)}
          y={HEIGHT - 8}
          textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
        >
          Day {index + 1}
        </text>
      ))}

      <line
        x1={MARGIN_LEFT}
        x2={MARGIN_LEFT + innerWidth}
        y1={y(0).toFixed(1)}
        y2={y(0).toFixed(1)}
        stroke="var(--grey-line)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <line
        x1={x(annotationIndex).toFixed(1)}
        x2={x(annotationIndex).toFixed(1)}
        y1={y(annotation.currentPence).toFixed(1)}
        y2={(annotationBase + 4).toFixed(1)}
        stroke="rgba(18,21,15,.32)"
        strokeWidth={1}
      />
      <text className="anno-t" x={annotationX.toFixed(1)} y={(annotationBase - 14).toFixed(1)}>
        {ANNOTATION_LINES[0]}
      </text>
      <text className="anno-t" x={annotationX.toFixed(1)} y={annotationBase.toFixed(1)}>
        {ANNOTATION_LINES[1]}
      </text>

      <path
        d={path((point) => point.currentPence)}
        fill="none"
        stroke="#69808f"
        strokeWidth={1.75}
      />
      <path d={path((point) => point.enginePence)} fill="none" stroke="#e5ae07" strokeWidth={2.5} />
      <circle
        cx={x(count - 1).toFixed(1)}
        cy={y(last.enginePence).toFixed(1)}
        r={3.5}
        fill="#e5ae07"
      />
      <circle
        cx={x(count - 1).toFixed(1)}
        cy={y(last.currentPence).toFixed(1)}
        r={3}
        fill="#69808f"
      />
      <text className="line-lab" x={x(count - 1) + 10} y={y(last.enginePence) - 7} fill="#8a6a03">
        Engine
      </text>
      <text className="line-lab" x={x(count - 1) + 10} y={y(last.currentPence) + 14} fill="#69808f">
        Current
      </text>
    </svg>
  );
};

/*
 * Memoised on the day series alone, so dragging a slider redraws the paths
 * without the surrounding band, the key or the table taking part.
 */
const Chart = memo(ChartView);

/** The thirty day comparison of the three policies, drawn from the live run. */
export const PolicyChart = ({ days }: PolicyChartProps): ReactElement => (
  <Band>
    <SectionHead
      eyebrow="Thirty days, three policies"
      title="The gap opens in the first week."
      lede="Every line here runs on identical stock and identical demand. The only thing that changes is the rule used to decide the reduction. Doing nothing is the flat zero. The store's current policy is a quarter off at three, half price at six. The engine picks its own moment."
    />
    <div className="chart-shell">
      <div className="chart-key">
        <span className="key">
          <i className="engine" /> Engine
        </span>
        <span className="key">
          <i className="current" /> 25% at 15:00, 50% at 18:00
        </span>
        <span className="key">
          <i className="none" /> No markdown
        </span>
      </div>
      {days.length < 2 ? <Note>Working out thirty days of trade.</Note> : <Chart days={days} />}
    </div>
  </Band>
);

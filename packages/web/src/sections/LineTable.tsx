import { memo, useMemo, useState, type ReactElement } from 'react';
import { CATALOGUE, type LineAggregate } from '@secondshelf/domain';
import { CURRENT_STORE_POLICY } from '@secondshelf/engine';
import { Band, Note, SectionHead } from '../components/primitives';
import { formatInteger, formatPlan, formatPounds } from '../lib/format';
import './sections.css';

/** The hour the first markdown round is walked, and so where life is measured from. */
const MARKDOWN_ROUND_HOUR_INDEX = 8;

const CATALOGUE_BY_ID = new Map(CATALOGUE.map((line) => [line.id, line]));

type SortKey = 'name' | 'category' | 'life' | 'stock' | 'price' | 'recovered';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly lifeHours: number;
  readonly stockUnits: number;
  readonly pricePence: number;
  readonly enginePlan: string;
  readonly recoveredPerDayPence: number;
}

interface Column {
  readonly key: SortKey | null;
  readonly label: string;
  readonly numeric: boolean;
  /** True when the highest value is the most interesting first click. */
  readonly descendingFirst: boolean;
}

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'Line', numeric: false, descendingFirst: false },
  { key: 'category', label: 'Category', numeric: false, descendingFirst: false },
  { key: 'life', label: 'Life left at 15:00', numeric: true, descendingFirst: false },
  { key: 'stock', label: 'Stock', numeric: true, descendingFirst: true },
  { key: 'price', label: 'Full price', numeric: true, descendingFirst: true },
  { key: null, label: 'Current policy', numeric: true, descendingFirst: false },
  { key: null, label: 'Engine', numeric: true, descendingFirst: false },
  { key: 'recovered', label: 'Recovered per day', numeric: true, descendingFirst: true },
];

const buildRows = (lines: readonly LineAggregate[], dayCount: number): readonly Row[] =>
  lines.flatMap((aggregate) => {
    const line = CATALOGUE_BY_ID.get(aggregate.lineId);
    if (line === undefined) return [];
    return [
      {
        id: aggregate.lineId,
        name: aggregate.name,
        category: aggregate.category,
        lifeHours: line.saleableHoursAtOpen - MARKDOWN_ROUND_HOUR_INDEX,
        stockUnits: aggregate.meanStockUnits,
        pricePence: line.fullPricePence,
        enginePlan: formatPlan(aggregate.samplePlan),
        recoveredPerDayPence: dayCount > 0 ? aggregate.netValueRecoveredPence / dayCount : 0,
      },
    ];
  });

const compare = (key: SortKey, a: Row, b: Row): number => {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name, 'en-GB');
    case 'category':
      return a.category.localeCompare(b.category, 'en-GB') || a.name.localeCompare(b.name, 'en-GB');
    case 'life':
      return a.lifeHours - b.lifeHours;
    case 'stock':
      return a.stockUnits - b.stockUnits;
    case 'price':
      return a.pricePence - b.pricePence;
    case 'recovered':
      return a.recoveredPerDayPence - b.recoveredPerDayPence;
  }
};

const lifeTone = (hours: number): string => (hours <= 1 ? 'high' : hours <= 4 ? 'mid' : 'low');

const signedPounds = (pence: number): string =>
  `${pence >= 0 ? '+' : '-'}${formatPounds(Math.abs(pence), 2)}`;

interface LineTableProps {
  readonly lines: readonly LineAggregate[];
  readonly dayCount: number;
}

const TableView = ({ lines, dayCount }: LineTableProps): ReactElement => {
  const [sortKey, setSortKey] = useState<SortKey>('recovered');
  const [descending, setDescending] = useState(true);

  const rows = useMemo(() => {
    const built = [...buildRows(lines, dayCount)];
    built.sort((a, b) => (descending ? -1 : 1) * compare(sortKey, a, b));
    return built;
  }, [lines, dayCount, sortKey, descending]);

  const toggle = (column: Column): void => {
    if (column.key === null) return;
    if (column.key === sortKey) {
      setDescending((previous) => !previous);
      return;
    }
    setSortKey(column.key);
    setDescending(column.descendingFirst);
  };

  const currentPolicy = formatPlan(CURRENT_STORE_POLICY);

  return (
    <div className="table-scroll">
      <table>
        <caption className="visually-hidden">
          Every line the store carries, with what the current policy and the engine each do to it,
          and the value the engine returns above the current policy per trading day.
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = column.key !== null && column.key === sortKey;
              return (
                <th
                  key={column.label}
                  scope="col"
                  className={column.numeric ? 'num' : undefined}
                  aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
                >
                  {column.key === null ? (
                    column.label
                  ) : (
                    <button
                      type="button"
                      className="sort-btn"
                      onClick={() => {
                        toggle(column);
                      }}
                    >
                      {column.label}
                      <span className="sort-arrow" aria-hidden="true">
                        {active ? (descending ? 'DESC' : 'ASC') : ''}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="name">{row.name}</td>
              <td className="cat">{row.category}</td>
              <td className="num">
                <span className={`hrs ${lifeTone(row.lifeHours)}`}>
                  {row.lifeHours <= 0 ? 'off sale today' : `${row.lifeHours} hrs`}
                </span>
              </td>
              <td className="num">{formatInteger(row.stockUnits)}</td>
              <td className="num">{formatPounds(row.pricePence, 2)}</td>
              <td className="num">{currentPolicy}</td>
              <td className="num eng">{row.enginePlan}</td>
              <td className="num eng">{signedPounds(row.recoveredPerDayPence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/*
 * Memoised on the aggregates, so a slider drag that only moves the chart leaves
 * twenty four rows untouched.
 */
const SortableTable = memo(TableView);

/** The line by line comparison, sortable by any column that holds a number. */
export const LineTable = ({ lines, dayCount }: LineTableProps): ReactElement => (
  <Band>
    <SectionHead
      eyebrow="Line by line"
      title="What the engine does differently."
      lede={`Averaged over the ${dayCount} days. The current policy reduces everything at the same time by the same amount, so it gives money away on lines that would have sold anyway, and reaches the fast-spoiling ones too late.`}
    />
    <SortableTable lines={lines} dayCount={dayCount} />
    <Note>
      Life left is measured from 15:00, the hour the first markdown round is usually walked.
      Recovered is the value the engine returns above the current policy, per line, per trading day.
    </Note>
  </Band>
);

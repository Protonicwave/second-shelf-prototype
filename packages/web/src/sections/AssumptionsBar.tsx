import type { ReactElement } from 'react';
import { ASSUMPTION_RANGES, DEFAULT_DAY_COUNT, type AssumptionRange } from '@secondshelf/domain';
import type { Assumptions } from '@secondshelf/engine';
import { formatDecimal, formatPounds } from '../lib/format';
import './sections.css';

interface ControlProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly display: string;
  readonly range: AssumptionRange;
  readonly onChange: (value: number) => void;
}

const Control = ({ id, label, value, display, range, onChange }: ControlProps): ReactElement => (
  <div className="ctrl">
    <div className="ctrl-top">
      <label htmlFor={id}>{label}</label>
      <b>{display}</b>
    </div>
    <input
      id={id}
      type="range"
      min={range.min}
      max={range.max}
      step={range.step}
      value={value}
      aria-valuetext={display}
      onChange={(event) => {
        onChange(Number(event.target.value));
      }}
    />
  </div>
);

interface AssumptionsBarProps {
  readonly assumptions: Assumptions;
  readonly recoveredPence: number | null;
  readonly pending: boolean;
  readonly error: string | null;
  readonly onChange: (next: Assumptions) => void;
}

/** The three values a reader is invited to disagree with, and the live total. */
export const AssumptionsBar = ({
  assumptions,
  recoveredPence,
  pending,
  error,
  onChange,
}: AssumptionsBarProps): ReactElement => (
  <div className="assume">
    <div className="wrap assume-in">
      <div className="assume-lab">
        Assumptions
        <br />
        you can argue with
      </div>
      <Control
        id="price-sensitivity"
        label="Price sensitivity"
        value={assumptions.priceSensitivity}
        display={`${formatDecimal(assumptions.priceSensitivity, 1)} times`}
        range={ASSUMPTION_RANGES.priceSensitivity}
        onChange={(priceSensitivity) => {
          onChange({ ...assumptions, priceSensitivity });
        }}
      />
      <Control
        id="staff-cost"
        label="Staff time per markdown"
        value={assumptions.staffCostPerEventPence}
        display={formatPounds(assumptions.staffCostPerEventPence, 2)}
        range={ASSUMPTION_RANGES.staffCostPerEventPence}
        onChange={(staffCostPerEventPence) => {
          onChange({ ...assumptions, staffCostPerEventPence });
        }}
      />
      <Control
        id="disposal-cost"
        label="Disposal cost per unit"
        value={assumptions.disposalCostPerUnitPence}
        display={formatPounds(assumptions.disposalCostPerUnitPence, 2)}
        range={ASSUMPTION_RANGES.disposalCostPerUnitPence}
        onChange={(disposalCostPerUnitPence) => {
          onChange({ ...assumptions, disposalCostPerUnitPence });
        }}
      />
      <div className="assume-out">
        <div className="k">Recovered, {DEFAULT_DAY_COUNT} days</div>
        <div className="v" aria-live="polite" aria-busy={pending}>
          {error ?? (recoveredPence === null ? 'Working' : formatPounds(recoveredPence))}
        </div>
      </div>
    </div>
  </div>
);

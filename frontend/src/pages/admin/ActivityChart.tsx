import { useId, useState } from 'react';
import { formatCount } from '../../lib/format';

interface Point {
  day: string;
  value: number;
}

const WIDTH = 420;
const HEIGHT = 150;
const PAD_TOP = 22;
const PAD_BOTTOM = 26;
const PAD_LEFT = 30;
const BAR_MAX = 24;
const RADIUS = 4;

const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

/** Дата YYYY-MM-DD — это календарный день, без часового пояса. */
const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Ближайшее «круглое» число сверху для верхней линии сетки. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value)!;
  return step * magnitude;
}

/** Столбик: скругление 4px только сверху, у базовой линии угол прямой. */
function barPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, height, width / 2);
  const bottom = y + height;
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${bottom} Z`;
}

interface Props {
  title: string;
  points: Point[];
  /** Подпись единиц для подсказки: «пинов», «перцев»… */
  unit: (n: number) => string;
}

/** Один ряд — одна карточка: разный масштаб показателей не сводим на общую ось. */
export function ActivityChart({ title, points, unit }: Props) {
  const titleId = useId();
  const [active, setActive] = useState<number | null>(null);

  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = (WIDTH - PAD_LEFT) / points.length;
  const barWidth = Math.min(BAR_MAX, slot - 4);
  const baseline = PAD_TOP + plotHeight;
  const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  const total = points.reduce((sum, p) => sum + p.value, 0);

  const hovered = active === null ? null : points[active];

  return (
    <figure className="activity-chart" aria-labelledby={titleId}>
      <figcaption id={titleId}>
        <strong>{title}</strong>
        <span className="muted">
          {formatCount(total)} за 14 дней
        </span>
      </figcaption>
      <div className="activity-chart__plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${title}: ${total} за 14 дней`}>
          {/* верхняя линия сетки с круглым значением и базовая линия */}
          <line x1={PAD_LEFT} x2={WIDTH} y1={PAD_TOP} y2={PAD_TOP} className="activity-chart__grid" />
          <line x1={PAD_LEFT} x2={WIDTH} y1={baseline} y2={baseline} className="activity-chart__axis" />
          <text x={PAD_LEFT - 6} y={PAD_TOP + 4} className="activity-chart__tick" textAnchor="end">
            {formatCount(max)}
          </text>
          <text x={PAD_LEFT - 6} y={baseline + 4} className="activity-chart__tick" textAnchor="end">
            0
          </text>

          {points.map((point, index) => {
            const height = (point.value / max) * plotHeight;
            const x = PAD_LEFT + index * slot + (slot - barWidth) / 2;
            const y = baseline - height;
            const date = parseDay(point.day);
            const isEdge = index === 0 || index === points.length - 1;
            return (
              <g
                key={point.day}
                className={`activity-chart__bar${active === index ? ' is-active' : ''}`}
                tabIndex={0}
                role="img"
                aria-label={`${longDate.format(date)}: ${point.value} ${unit(point.value)}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                {/* зона наведения — вся колонка, а не только закрашенные пиксели */}
                <rect x={PAD_LEFT + index * slot} y={PAD_TOP} width={slot} height={plotHeight} fill="transparent" />
                {height > 0 && <path d={barPath(x, y, barWidth, height)} className="activity-chart__fill" />}
                {index === peak && point.value > 0 && (
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="activity-chart__value">
                    {formatCount(point.value)}
                  </text>
                )}
                {isEdge && (
                  <text
                    x={index === 0 ? PAD_LEFT + index * slot : x + barWidth}
                    y={HEIGHT - 6}
                    textAnchor={index === 0 ? 'start' : 'end'}
                    className="activity-chart__tick"
                  >
                    {index === points.length - 1 ? 'сегодня' : shortDate.format(date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hovered && active !== null && (
          <div
            className="activity-chart__tooltip"
            style={{ left: `${((PAD_LEFT + (active + 0.5) * slot) / WIDTH) * 100}%` }}
            aria-hidden
          >
            <strong>{formatCount(hovered.value)}</strong>
            <span>{unit(hovered.value)}</span>
            <small>{longDate.format(parseDay(hovered.day))}</small>
          </div>
        )}
      </div>
    </figure>
  );
}

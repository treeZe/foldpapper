import type { CSSProperties } from 'react';

interface Tab<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Сегментированный переключатель с «бумажным» ползунком. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: Props<T>) {
  const index = Math.max(0, tabs.findIndex((tab) => tab.value === value));
  return (
    <div className="tabs" role="tablist" aria-label={label} style={{ '--count': tabs.length, '--index': index } as CSSProperties}>
      <span className="tabs__slider" aria-hidden />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          className={tab.value === value ? 'is-active' : ''}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

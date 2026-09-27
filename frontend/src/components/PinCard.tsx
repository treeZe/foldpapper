import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Pin } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { averageHeat, heatColor } from '../lib/heat';
import { displayName, formatCount } from '../lib/format';
import { BookmarkIcon, PepperIcon } from './Icons';
import { PepperMeter } from './PepperMeter';
import { SaveToBoardModal } from './SaveToBoardModal';
import { Avatar } from './ui';

export const pinRatio = (pin: Pin) =>
  pin.imageWidth && pin.imageHeight ? Math.min(pin.imageHeight / pin.imageWidth, 2.2) : 1.25;

interface Props {
  pin: Pin;
  /** Доп. действие в углу карточки (например, «убрать с доски»). */
  extraAction?: ReactNode;
}

export function PinCard({ pin, extraAction }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const heat = averageHeat(pin.heatScore, pin.pepperCount);

  return (
    <article className="pin-card" style={{ '--heat': heatColor(heat) } as CSSProperties}>
      <div className="pin-card__frame">
        <Link to={`/pin/${pin.id}`} className="pin-card__media" style={{ aspectRatio: `1 / ${pinRatio(pin)}` }}>
          <img
            src={pin.imageUrl}
            alt={pin.title ?? 'Пин'}
            loading="lazy"
            className={loaded ? 'is-loaded' : ''}
            onLoad={() => setLoaded(true)}
          />
          <span className="pin-card__fold" aria-hidden />
          {pin.pepperCount > 0 && (
            <span className="pin-card__heat" title={`Средняя острота ${heat} из 5`}>
              <PepperIcon size={15} color="var(--heat)" />
              {formatCount(pin.heatScore)}
            </span>
          )}
        </Link>

        <div className="pin-card__overlay">
          <div className="pin-card__top">
            {extraAction}
            {user && (
              <button type="button" className="button button--chili button--sm" onClick={() => setSaving(true)}>
                <BookmarkIcon size={16} /> Сохранить
              </button>
            )}
          </div>
          <div className="pin-card__meter">
            <PepperMeter pin={pin} size="sm" />
          </div>
        </div>
      </div>

      <footer className="pin-card__footer">
        {pin.title && (
          <Link to={`/pin/${pin.id}`} className="pin-card__title">
            {pin.title}
          </Link>
        )}
        <Link to={`/u/${pin.author.username}`} className="pin-card__author">
          <Avatar user={pin.author} size={22} />
          <span>{displayName(pin.author)}</span>
        </Link>
      </footer>

      {saving && <SaveToBoardModal pin={pin} onClose={() => setSaving(false)} />}
    </article>
  );
}

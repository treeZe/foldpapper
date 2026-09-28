import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Pin } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { averageHeat, heatColor } from '../lib/heat';
import { displayName, formatCount, plural } from '../lib/format';
import { BookmarkIcon, PepperIcon } from './Icons';
import { PepperMeter } from './PepperMeter';
import { SaveToBoardModal } from './SaveToBoardModal';
import { Avatar } from './ui';

export const pinRatio = (pin: Pin) =>
  pin.imageWidth && pin.imageHeight ? Math.min(pin.imageHeight / pin.imageWidth, 2.2) : 1.25;

/** Сумма всех перцев пина и, если пользователь уже оценил, его собственные перцы рядом. */
function HeatBadge({ pin, heat }: { pin: Pin; heat: number }) {
  const mine = pin.myPepper ?? 0;
  const total = `Всего ${pin.heatScore} ${plural(pin.heatScore, 'перец', 'перца', 'перцев')}, средняя острота ${heat} из 5`;
  return (
    <span className="pin-card__heat" title={mine ? `${total}. Ваша оценка: ${mine}` : total}>
      <span className="pin-card__heat-total">
        <PepperIcon size={15} />
        {formatCount(pin.heatScore)}
      </span>
      {mine > 0 && (
        <span className="pin-card__heat-mine" style={{ '--mine': heatColor(mine) } as CSSProperties}>
          вы
          <PepperIcon size={14} color="var(--mine)" />
          {mine}
        </span>
      )}
    </span>
  );
}

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
    <article
      // оценённый пин остаётся с загнутым уголком в цвет своей оценки — как закладка в книге
      className={`pin-card${pin.myPepper ? ' is-dog-eared' : ''}`}
      style={{ '--heat': heatColor(heat), '--fold-color': heatColor(pin.myPepper ?? heat) } as CSSProperties}
    >
      <div className="pin-card__frame">
        <Link to={`/pin/${pin.id}`} className="pin-card__media" style={{ aspectRatio: `1 / ${pinRatio(pin)}` }}>
          <span className="pin-card__paper">
            <img
              src={pin.imageUrl}
              alt={pin.title ?? 'Пин'}
              loading="lazy"
              className={loaded ? 'is-loaded' : ''}
              onLoad={() => setLoaded(true)}
            />
            {pin.pepperCount > 0 && <HeatBadge pin={pin} heat={heat} />}
          </span>
          <span className="pin-card__fold" aria-hidden />
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
            <span className="pin-card__meter-total" title={`Всего перцев: ${pin.heatScore}`}>
              {formatCount(pin.heatScore)}
            </span>
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

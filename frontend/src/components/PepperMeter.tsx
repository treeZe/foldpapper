import { useState, type CSSProperties } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { pinsApi } from '../api/endpoints';
import { patchPinEverywhere } from '../api/cache';
import type { Pin } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { HEAT_LEVELS } from '../lib/heat';
import { PepperIcon } from './Icons';
import { useToast } from './Toast';

/** Ставит/меняет/убирает перец с оптимистичным обновлением всех лент. */
export function usePepper(pin: Pin) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (heat: number | null) => (heat === null ? pinsApi.removePepper(pin.id) : pinsApi.setPepper(pin.id, heat)),
    onMutate: (heat) => {
      const previous = { myPepper: pin.myPepper, pepperCount: pin.pepperCount, heatScore: pin.heatScore };
      const had = pin.myPepper ?? 0;
      const next = heat ?? 0;
      patchPinEverywhere(queryClient, pin.id, {
        myPepper: heat ?? undefined,
        pepperCount: pin.pepperCount + (had === 0 && next > 0 ? 1 : 0) - (had > 0 && next === 0 ? 1 : 0),
        heatScore: pin.heatScore - had + next,
      });
      return previous;
    },
    onSuccess: (response) =>
      patchPinEverywhere(queryClient, pin.id, {
        myPepper: response.myPepper ?? undefined,
        pepperCount: response.pepperCount,
        heatScore: response.heatScore,
      }),
    onError: (error, _heat, previous) => {
      if (previous) patchPinEverywhere(queryClient, pin.id, previous);
      toast(error.message, 'error');
    },
  });
}

interface Props {
  pin: Pin;
  size?: 'sm' | 'lg';
}

interface Scrap {
  angle: number;
  distance: number;
  spin: number;
  delay: number;
  size: number;
}

/** Бумажные обрезки, которые разлетаются из перца при оценке: чем острее, тем больше. */
function makeScraps(level: number): Scrap[] {
  const count = 3 + level * 2;
  return Array.from({ length: count }, (_, i) => ({
    angle: (360 / count) * i + Math.random() * 30 - 15,
    distance: 18 + level * 4 + Math.random() * 14,
    spin: Math.random() * 540 - 270,
    delay: Math.random() * 60,
    size: 6 + Math.random() * 5,
  }));
}

export function PepperMeter({ pin, size = 'lg' }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mutation = usePepper(pin);
  const [hover, setHover] = useState(0);
  const [burst, setBurst] = useState<{ id: number; level: number; scraps: Scrap[] } | null>(null);
  const current = pin.myPepper ?? 0;
  const shown = hover || current;

  const choose = (value: number) => {
    if (!user) {
      navigate('/login', { state: { from: `/pin/${pin.id}` } });
      return;
    }
    // повторный клик по текущей остроте убирает перец
    const removing = value === current;
    mutation.mutate(removing ? null : value);
    if (!removing) setBurst({ id: Date.now(), level: value, scraps: makeScraps(value) });
  };

  return (
    <div className={`pepper-meter pepper-meter--${size}`} onMouseLeave={() => setHover(0)}>
      <div className="pepper-meter__row" role="radiogroup" aria-label="Острота перца">
        {HEAT_LEVELS.map((level) => {
          const active = level.value <= shown;
          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={current === level.value}
              aria-label={`${level.value} — ${level.label}`}
              title={level.label}
              className={`pepper-meter__pepper${active ? ' is-active' : ''}`}
              style={{ '--pepper-color': active ? HEAT_LEVELS[shown - 1].color : undefined } as CSSProperties}
              onMouseEnter={() => setHover(level.value)}
              onFocus={() => setHover(level.value)}
              onBlur={() => setHover(0)}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                choose(level.value);
              }}
            >
              <PepperIcon size={size === 'lg' ? 30 : 20} filled={active} color={active ? 'var(--pepper-color)' : 'currentColor'} />
              {burst?.level === level.value && (
                <span
                  key={burst.id}
                  className="paper-burst"
                  aria-hidden
                  style={{ '--scrap-color': level.color } as CSSProperties}
                >
                  {burst.scraps.map((scrap, i) => (
                    <span
                      key={i}
                      style={
                        {
                          '--angle': `${scrap.angle}deg`,
                          '--distance': `${scrap.distance}px`,
                          '--spin': `${scrap.spin}deg`,
                          '--size': `${scrap.size}px`,
                          animationDelay: `${scrap.delay}ms`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {size === 'lg' && (
        <span className="pepper-meter__label">
          {!hover && current > 0 ? (
            <>
              <span className="pepper-meter__mine" style={{ '--mine': HEAT_LEVELS[current - 1].color } as CSSProperties}>
                Ваша оценка: {current} <PepperIcon size={15} color="var(--mine)" />
              </span>
              <span style={{ color: HEAT_LEVELS[current - 1].color }}>{HEAT_LEVELS[current - 1].label}</span>
              <small>нажмите ещё раз, чтобы убрать</small>
            </>
          ) : (
            <span style={{ color: shown ? HEAT_LEVELS[shown - 1].color : undefined }}>
              {shown ? HEAT_LEVELS[shown - 1].label : 'Оцените остроту'}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

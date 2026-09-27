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

export function PepperMeter({ pin, size = 'lg' }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mutation = usePepper(pin);
  const [hover, setHover] = useState(0);
  const current = pin.myPepper ?? 0;
  const shown = hover || current;

  const choose = (value: number) => {
    if (!user) {
      navigate('/login', { state: { from: `/pin/${pin.id}` } });
      return;
    }
    // повторный клик по текущей остроте убирает перец
    mutation.mutate(value === current ? null : value);
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
            </button>
          );
        })}
      </div>
      {size === 'lg' && (
        <span className="pepper-meter__label" style={{ color: shown ? HEAT_LEVELS[shown - 1].color : undefined }}>
          {shown ? HEAT_LEVELS[shown - 1].label : 'Оцените остроту'}
          {!hover && current > 0 && <small> · нажмите ещё раз, чтобы убрать</small>}
        </span>
      )}
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reportsApi } from '../api/endpoints';
import type { ReportReason } from '../api/types';
import { useToast } from './Toast';
import { Field, Modal } from './ui';

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'SPAM', label: 'Спам или реклама', hint: 'Навязчивая реклама, ссылки на сомнительные сайты' },
  { value: 'NSFW', label: 'Контент 18+', hint: 'Откровенные или шокирующие изображения' },
  { value: 'OFFENSIVE', label: 'Оскорбления', hint: 'Травля, язык вражды, угрозы' },
  { value: 'COPYRIGHT', label: 'Нарушение авторских прав', hint: 'Чужая работа без указания автора' },
  { value: 'OTHER', label: 'Другое', hint: 'Опишите проблему в комментарии' },
];

export const reasonLabel = (reason: ReportReason) => REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;

export function ReportModal({ pinId, onClose }: { pinId: string; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => reportsApi.create(pinId, reason!, comment.trim() || undefined),
    onSuccess: () => {
      toast('Спасибо! Модераторы посмотрят жалобу', 'success');
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (reason) mutation.mutate();
  };

  return (
    <Modal title="Пожаловаться на пин" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="reason-list" role="radiogroup" aria-label="Причина жалобы">
          {REPORT_REASONS.map((item) => (
            <label key={item.value} className={`reason${reason === item.value ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="reason"
                value={item.value}
                checked={reason === item.value}
                onChange={() => setReason(item.value)}
              />
              <span>
                <strong>{item.label}</strong>
                <small className="muted">{item.hint}</small>
              </span>
            </label>
          ))}
        </div>
        <Field label="Комментарий" hint="Необязательно, до 500 символов">
          <textarea className="input" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        {mutation.error && <p className="form__error">{mutation.error.message}</p>}
        <div className="form__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="button button--chili" disabled={!reason || mutation.isPending}>
            Отправить жалобу
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { boardsApi } from '../api/endpoints';
import type { Board } from '../api/types';
import { formatCount, plural } from '../lib/format';
import { LockIcon } from './Icons';
import { useToast } from './Toast';
import { Field, Modal } from './ui';

export function BoardCard({ board }: { board: Board }) {
  return (
    <Link to={`/board/${board.id}`} className="board-card">
      <div className="board-card__cover">
        {board.coverImageUrl ? <img src={board.coverImageUrl} alt="" loading="lazy" /> : <span className="board-card__blank" />}
        <span className="board-card__sheet" aria-hidden />
        <span className="board-card__sheet board-card__sheet--2" aria-hidden />
      </div>
      <div className="board-card__meta">
        <h3>
          {board.title}
          {board.isPrivate && <LockIcon size={15} aria-label="Секретная доска" />}
        </h3>
        <span className="muted">
          {formatCount(board.pinCount)} {plural(board.pinCount, 'пин', 'пина', 'пинов')}
        </span>
      </div>
    </Link>
  );
}

interface FormProps {
  board?: Board;
  onClose: () => void;
  onSaved?: (board: Board) => void;
}

/** Создание или редактирование доски. */
export function BoardFormModal({ board, onClose, onSaved }: FormProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(board?.title ?? '');
  const [description, setDescription] = useState(board?.description ?? '');
  const [isPrivate, setIsPrivate] = useState(board?.isPrivate ?? false);

  const mutation = useMutation({
    mutationFn: () => {
      const body = { title: title.trim(), description: description.trim(), isPrivate };
      return board ? boardsApi.update(board.id, body) : boardsApi.create(body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.setQueryData(['board', saved.id], saved);
      toast(board ? 'Доска обновлена' : 'Доска создана', 'success');
      onSaved?.(saved);
      onClose();
    },
  });

  const fieldErrors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : {};

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal title={board ? 'Редактировать доску' : 'Новая доска'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название" error={fieldErrors.title}>
          <input
            className="input"
            value={title}
            maxLength={80}
            required
            autoFocus
            placeholder="Например, «Соусы, от которых плачут»"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Описание" error={fieldErrors.description}>
          <textarea
            className="input"
            rows={3}
            value={description}
            maxLength={500}
            placeholder="О чём эта доска?"
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <label className="switch">
          <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
          <span className="switch__track" aria-hidden />
          <span>
            <strong>Секретная доска</strong>
            <small className="muted"> — видна только вам</small>
          </span>
        </label>
        {mutation.error && !Object.keys(fieldErrors).length && <p className="form__error">{mutation.error.message}</p>}
        <div className="form__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="button button--chili" disabled={!title.trim() || mutation.isPending}>
            {board ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

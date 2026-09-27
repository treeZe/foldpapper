import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { pinsApi } from '../api/endpoints';
import { dropPinEverywhere, patchPinEverywhere } from '../api/cache';
import type { Pin } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FollowButton } from '../components/FollowButton';
import { ArrowLeftIcon, BookmarkIcon, EditIcon, LinkIcon, PepperIcon, TrashIcon } from '../components/Icons';
import { PepperMeter } from '../components/PepperMeter';
import { PinGrid } from '../components/PinGrid';
import { SaveToBoardModal } from '../components/SaveToBoardModal';
import { useToast } from '../components/Toast';
import { Avatar, ErrorState, Field, Modal, Spinner } from '../components/ui';
import { averageHeat, HEAT_LEVELS } from '../lib/heat';
import { displayName, formatCount, formatDate, hostOf, parseTags, plural } from '../lib/format';

function EditPinModal({ pin, onClose }: { pin: Pin; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(pin.title ?? '');
  const [description, setDescription] = useState(pin.description ?? '');
  const [sourceUrl, setSourceUrl] = useState(pin.sourceUrl ?? '');
  const [tags, setTags] = useState(pin.tags.join(', '));

  const mutation = useMutation({
    mutationFn: () => pinsApi.update(pin.id, { title, description, sourceUrl, tags: parseTags(tags) }),
    onSuccess: (updated) => {
      patchPinEverywhere(queryClient, pin.id, updated);
      toast('Пин обновлён', 'success');
      onClose();
    },
  });
  const errors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : {};

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal title="Редактировать пин" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название" error={errors.title}>
          <input className="input" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Описание" error={errors.description}>
          <textarea className="input" rows={4} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Ссылка на источник" error={errors.sourceUrl}>
          <input className="input" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </Field>
        <Field label="Теги" hint="Через пробел или запятую">
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        {mutation.error && !Object.keys(errors).length && <p className="form__error">{mutation.error.message}</p>}
        <div className="form__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="button button--chili" disabled={mutation.isPending}>
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PinPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const query = useQuery({ queryKey: ['pin', id], queryFn: () => pinsApi.get(id) });

  const remove = useMutation({
    mutationFn: () => pinsApi.remove(id),
    onSuccess: () => {
      dropPinEverywhere(queryClient, id);
      toast('Пин удалён', 'success');
      navigate(`/u/${user?.username}`);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  if (query.isPending) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const pin = query.data;
  const isOwner = user?.id === pin.author.id;
  const heat = averageHeat(pin.heatScore, pin.pepperCount);
  const host = hostOf(pin.sourceUrl);
  const relatedTag = pin.tags[0];

  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    toast('Ссылка скопирована', 'success');
  };

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}>
        <ArrowLeftIcon size={18} /> Назад
      </button>

      <article className="pin-detail">
        <div className="pin-detail__media">
          <img src={pin.imageUrl} alt={pin.title ?? 'Пин'} />
        </div>

        <div className="pin-detail__info">
          <div className="pin-detail__actions">
            <div className="pin-detail__tools">
              <button type="button" className="icon-button" onClick={copyLink} title="Скопировать ссылку" aria-label="Скопировать ссылку">
                <LinkIcon />
              </button>
              {isOwner && (
                <>
                  <button type="button" className="icon-button" onClick={() => setEditing(true)} title="Редактировать" aria-label="Редактировать">
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    title="Удалить"
                    aria-label="Удалить"
                    disabled={remove.isPending}
                    onClick={() => confirm('Удалить пин навсегда?') && remove.mutate()}
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
            {user ? (
              <button type="button" className="button button--chili" onClick={() => setSaving(true)}>
                <BookmarkIcon size={18} /> Сохранить
              </button>
            ) : (
              <Link to="/login" state={{ from: `/pin/${pin.id}` }} className="button button--chili">
                <BookmarkIcon size={18} /> Сохранить
              </Link>
            )}
          </div>

          {host && (
            <a className="pin-detail__source" href={pin.sourceUrl} target="_blank" rel="noreferrer noopener">
              <LinkIcon size={15} /> {host}
            </a>
          )}
          {pin.title && <h1 className="pin-detail__title">{pin.title}</h1>}
          {pin.description && <p className="pin-detail__description">{pin.description}</p>}

          {pin.tags.length > 0 && (
            <div className="tag-cloud tag-cloud--wrap">
              {pin.tags.map((tag) => (
                <Link key={tag} to={`/search?tag=${encodeURIComponent(tag)}`} className="chip">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <section className="heat-panel">
            <div className="heat-panel__stats">
              <div>
                <strong>{formatCount(pin.pepperCount)}</strong>
                <span>{plural(pin.pepperCount, 'перец', 'перца', 'перцев')}</span>
              </div>
              <div>
                <strong style={{ color: heat ? HEAT_LEVELS[heat - 1].color : undefined }}>
                  {heat ? HEAT_LEVELS[heat - 1].label : '—'}
                </strong>
                <span>средняя острота</span>
              </div>
              <div>
                <strong>{formatCount(pin.saveCount)}</strong>
                <span>{plural(pin.saveCount, 'сохранение', 'сохранения', 'сохранений')}</span>
              </div>
            </div>
            <div className="heat-panel__bar" aria-hidden>
              <span style={{ width: `${(heat / 5) * 100}%` }} />
            </div>
            <PepperMeter pin={pin} />
          </section>

          <div className="author-row">
            <Link to={`/u/${pin.author.username}`} className="author-row__user">
              <Avatar user={pin.author} size={46} />
              <span>
                <strong>{displayName(pin.author)}</strong>
                <small className="muted">@{pin.author.username}</small>
              </span>
            </Link>
            <FollowButton username={pin.author.username} />
          </div>

          <p className="muted pin-detail__date">
            <PepperIcon size={14} color="var(--ink-3)" filled={false} /> Опубликовано {formatDate(pin.createdAt)}
          </p>
        </div>
      </article>

      <section className="related">
        <h2>{relatedTag ? `Ещё с тегом #${relatedTag}` : 'Ещё острое'}</h2>
        <PinGrid
          key={pin.id}
          queryKey={['pins', 'related', pin.id]}
          fetchPage={(page) =>
            pinsApi
              .explore(relatedTag ? { tag: relatedTag, sort: 'hot' } : { sort: 'hot' }, page)
              .then((result) => ({ ...result, items: result.items.filter((item) => item.id !== pin.id) }))
          }
        />
      </section>

      {saving && <SaveToBoardModal pin={pin} onClose={() => setSaving(false)} />}
      {editing && <EditPinModal pin={pin} onClose={() => setEditing(false)} />}
    </div>
  );
}

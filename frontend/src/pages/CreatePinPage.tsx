import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { mediaApi, pinsApi } from '../api/endpoints';
import { BoardFormModal } from '../components/BoardCard';
import { CloseIcon, LinkIcon, PlusIcon, UploadIcon } from '../components/Icons';
import { useMyBoards } from '../components/SaveToBoardModal';
import { useToast } from '../components/Toast';
import { Field, Spinner } from '../components/ui';
import { parseTags } from '../lib/format';

interface Picture {
  url: string;
  width?: number;
  height?: number;
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Размеры картинки по ссылке — нужны masonry-сетке, чтобы не прыгала вёрстка. */
function measure(url: string) {
  return new Promise<Picture>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Не удалось загрузить картинку по этой ссылке'));
    img.src = url;
  });
}

export function CreatePinPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const boards = useMyBoards();
  const fileInput = useRef<HTMLInputElement>(null);

  const [picture, setPicture] = useState<Picture | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlDraft, setUrlDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tags, setTags] = useState('');
  const [boardId, setBoardId] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);

  const upload = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: (stored) => setPicture({ url: stored.url, width: stored.width, height: stored.height }),
    onError: (error) => toast(error.message, 'error'),
  });

  const byUrl = useMutation({
    mutationFn: (url: string) => measure(url),
    onSuccess: setPicture,
    onError: (error) => toast(error.message, 'error'),
  });

  const create = useMutation({
    mutationFn: () =>
      pinsApi.create({
        imageUrl: picture!.url,
        imageWidth: picture!.width,
        imageHeight: picture!.height,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        tags: parseTags(tags),
        boardId: boardId || undefined,
      }),
    onSuccess: (pin) => {
      queryClient.invalidateQueries({ queryKey: ['pins'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast('Пин опубликован 🌶️', 'success');
      navigate(`/pin/${pin.id}`);
    },
  });
  const errors = create.error instanceof ApiError ? create.error.fieldErrors : {};

  const takeFile = (file?: File) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      toast('Подойдут JPEG, PNG, WebP или GIF', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Файл больше 10 МБ', 'error');
      return;
    }
    upload.mutate(file);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    takeFile(event.dataTransfer.files[0]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (picture) create.mutate();
  };

  const busy = upload.isPending || byUrl.isPending;

  return (
    <div className="page page--narrow">
      <section className="page-head">
        <h1>Новый пин</h1>
        <p className="muted">Картинка, пара слов и теги — остальное сделают перцы.</p>
      </section>

      <form className="create" onSubmit={submit}>
        <div className="create__media">
          {picture ? (
            <div className="create__preview">
              <img src={picture.url} alt="Превью" />
              <button type="button" className="icon-button icon-button--glass" onClick={() => setPicture(null)} aria-label="Убрать картинку">
                <CloseIcon />
              </button>
            </div>
          ) : mode === 'upload' ? (
            <div
              className={`dropzone${dragging ? ' is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && fileInput.current?.click()}
            >
              {busy ? (
                <Spinner label="Загружаем картинку…" />
              ) : (
                <>
                  <span className="dropzone__icon">
                    <UploadIcon size={30} />
                  </span>
                  <strong>Перетащите картинку сюда</strong>
                  <span className="muted">или нажмите, чтобы выбрать файл</span>
                  <small className="muted">JPEG, PNG, WebP, GIF · до 10 МБ</small>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT.join(',')}
                hidden
                onChange={(event) => takeFile(event.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="dropzone dropzone--url">
              <span className="dropzone__icon">
                <LinkIcon size={28} />
              </span>
              <strong>Картинка по ссылке</strong>
              <div className="inline-form">
                <input
                  className="input"
                  type="url"
                  placeholder="https://…"
                  value={urlDraft}
                  onChange={(event) => setUrlDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (urlDraft.trim()) byUrl.mutate(urlDraft.trim());
                    }
                  }}
                />
                <button type="button" className="button" disabled={!urlDraft.trim() || busy} onClick={() => byUrl.mutate(urlDraft.trim())}>
                  Взять
                </button>
              </div>
            </div>
          )}
          {!picture && (
            <button type="button" className="link-button" onClick={() => setMode(mode === 'upload' ? 'url' : 'upload')}>
              {mode === 'upload' ? 'Или вставить ссылку на картинку' : 'Или загрузить файл'}
            </button>
          )}
          {errors.imageUrl && <p className="form__error">{errors.imageUrl}</p>}
        </div>

        <div className="create__fields form">
          <Field label="Название" error={errors.title}>
            <input className="input" value={title} maxLength={160} placeholder="Халапеньо в меду" onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Описание" error={errors.description}>
            <textarea
              className="input"
              rows={4}
              value={description}
              maxLength={2000}
              placeholder="Расскажите, чем эта идея цепляет"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Ссылка на источник" error={errors.sourceUrl}>
            <input className="input" type="url" value={sourceUrl} placeholder="https://" onChange={(e) => setSourceUrl(e.target.value)} />
          </Field>
          <Field label="Теги" hint="Через пробел или запятую: закуски, острое, #перец">
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          {parseTags(tags).length > 0 && (
            <div className="tag-cloud tag-cloud--wrap">
              {parseTags(tags).map((tag) => (
                <span key={tag} className="chip chip--static">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <Field label="Доска">
            <div className="inline-form">
              <select className="input" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
                <option value="">Не добавлять на доску</option>
                {boards.data?.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.title}
                    {board.isPrivate ? ' 🔒' : ''}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-button" title="Новая доска" aria-label="Новая доска" onClick={() => setCreatingBoard(true)}>
                <PlusIcon />
              </button>
            </div>
          </Field>
          {create.error && !Object.keys(errors).length && <p className="form__error">{create.error.message}</p>}
          <div className="form__actions">
            <button type="submit" className="button button--chili button--lg" disabled={!picture || create.isPending}>
              {create.isPending ? 'Публикуем…' : 'Опубликовать'}
            </button>
          </div>
        </div>
      </form>

      {creatingBoard && <BoardFormModal onClose={() => setCreatingBoard(false)} onSaved={(board) => setBoardId(board.id)} />}
    </div>
  );
}

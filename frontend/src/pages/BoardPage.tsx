import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '../api/endpoints';
import type { Pin } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BoardFormModal } from '../components/BoardCard';
import { CloseIcon, EditIcon, LockIcon, TrashIcon } from '../components/Icons';
import { PinGrid } from '../components/PinGrid';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, ErrorState, Spinner } from '../components/ui';
import { displayName, formatCount, plural } from '../lib/format';

export function BoardPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const board = useQuery({ queryKey: ['board', id], queryFn: () => boardsApi.get(id) });

  const removeBoard = useMutation({
    mutationFn: () => boardsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast('Доска удалена, пины остались на месте', 'success');
      navigate(`/u/${user?.username}?tab=boards`);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const removePin = useMutation({
    mutationFn: (pin: Pin) => boardsApi.removePin(id, pin.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins', 'board', id] });
      queryClient.invalidateQueries({ queryKey: ['board', id] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast('Пин убран с доски', 'success');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  if (board.isPending) return <Spinner />;
  if (board.isError) return <ErrorState error={board.error} onRetry={() => board.refetch()} />;

  const data = board.data;
  const isOwner = user?.id === data.owner.id;

  return (
    <div className="page">
      <section className="board-head">
        <span className="eyebrow">
          {data.isPrivate && <LockIcon size={14} />} {data.isPrivate ? 'Секретная доска' : 'Доска'}
        </span>
        <h1>{data.title}</h1>
        {data.description && <p className="board-head__description">{data.description}</p>}
        <div className="board-head__meta">
          <Link to={`/u/${data.owner.username}`} className="author-row__user">
            <Avatar user={data.owner} size={32} />
            <span>{displayName(data.owner)}</span>
          </Link>
          <span className="muted">
            · {formatCount(data.pinCount)} {plural(data.pinCount, 'пин', 'пина', 'пинов')}
          </span>
        </div>
        {isOwner && (
          <div className="board-head__actions">
            <button type="button" className="button button--ghost" onClick={() => setEditing(true)}>
              <EditIcon size={16} /> Изменить
            </button>
            <button
              type="button"
              className="button button--ghost button--danger"
              disabled={removeBoard.isPending}
              onClick={() => confirm(`Удалить доску «${data.title}»? Пины останутся у авторов.`) && removeBoard.mutate()}
            >
              <TrashIcon size={16} /> Удалить
            </button>
          </div>
        )}
      </section>

      <PinGrid
        queryKey={['pins', 'board', id]}
        fetchPage={(page) => boardsApi.pins(id, page)}
        renderAction={
          isOwner
            ? (pin) => (
                <button
                  type="button"
                  className="button button--glass button--sm"
                  title="Убрать с доски"
                  onClick={() => removePin.mutate(pin)}
                >
                  <CloseIcon size={14} /> Убрать
                </button>
              )
            : undefined
        }
        empty={
          <EmptyState
            title="На доске пока пусто"
            text={isOwner ? 'Нажмите «Сохранить» на любом пине, чтобы положить его сюда.' : undefined}
            action={
              isOwner && (
                <Link to="/explore" className="button button--chili">
                  Найти идеи
                </Link>
              )
            }
          />
        }
      />

      {editing && <BoardFormModal board={data} onClose={() => setEditing(false)} />}
    </div>
  );
}

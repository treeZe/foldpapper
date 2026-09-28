import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi, pinsApi, usersApi } from '../api/endpoints';
import { patchPinEverywhere } from '../api/cache';
import type { Board, Pin } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { LockIcon, PlusIcon } from './Icons';
import { useToast } from './Toast';
import { Modal, Spinner } from './ui';

export function useMyBoards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['boards', user?.username],
    queryFn: () => usersApi.boards(user!.username),
    enabled: !!user,
  });
}

export function SaveToBoardModal({ pin, onClose }: { pin: Pin; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const boards = useMyBoards();
  const [newTitle, setNewTitle] = useState('');

  const save = useMutation({
    mutationFn: (board: Board) => boardsApi.savePin(board.id, pin.id).then(() => board),
    onSuccess: (board) => {
      // сохранение идемпотентно — точный saveCount берём с сервера, а не прибавляем сами
      pinsApi.get(pin.id).then((fresh) => patchPinEverywhere(queryClient, pin.id, { saveCount: fresh.saveCount }));
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['pins', 'board', board.id] });
      toast(`Сложено на доску «${board.title}»`, 'success');
      onClose();
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const create = useMutation({
    mutationFn: (title: string) => boardsApi.create({ title }),
    onSuccess: (board) => {
      setNewTitle('');
      save.mutate(board);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const submitNew = (event: FormEvent) => {
    event.preventDefault();
    if (newTitle.trim()) create.mutate(newTitle.trim());
  };

  return (
    <Modal title="Сохранить на доску" onClose={onClose}>
      <div className="save-modal">
        <img className="save-modal__preview" src={pin.imageUrl} alt="" />
        <div className="save-modal__list">
          {boards.isPending && <Spinner />}
          {boards.data?.length === 0 && <p className="muted">Досок пока нет — создайте первую.</p>}
          {boards.data?.map((board) => (
            <button
              key={board.id}
              type="button"
              className="board-option"
              disabled={save.isPending}
              onClick={() => save.mutate(board)}
            >
              <span className="board-option__cover">
                {board.coverImageUrl && <img src={board.coverImageUrl} alt="" />}
              </span>
              <span className="board-option__title">
                {board.title}
                {board.isPrivate && <LockIcon size={14} />}
              </span>
              <span className="board-option__action">Сохранить</span>
            </button>
          ))}
        </div>
        <form className="save-modal__new" onSubmit={submitNew}>
          <input
            className="input"
            placeholder="Новая доска, например «Острые закуски»"
            value={newTitle}
            maxLength={80}
            onChange={(event) => setNewTitle(event.target.value)}
          />
          <button type="submit" className="button" disabled={!newTitle.trim() || create.isPending}>
            <PlusIcon size={16} /> Создать
          </button>
        </form>
      </div>
    </Modal>
  );
}

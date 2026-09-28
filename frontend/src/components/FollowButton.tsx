import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { usersApi } from '../api/endpoints';
import type { User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toast';

export const profileQuery = (username: string) => ({
  queryKey: ['user', username.toLowerCase()],
  queryFn: () => usersApi.profile(username),
});

export function FollowButton({ username }: { username: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(username));
  const key = profileQuery(username).queryKey;

  const mutation = useMutation({
    mutationFn: (follow: boolean) => (follow ? usersApi.follow(username) : usersApi.unfollow(username)),
    onMutate: (follow) => {
      const previous = queryClient.getQueryData<User>(key);
      if (previous) {
        queryClient.setQueryData<User>(key, {
          ...previous,
          followedByMe: follow,
          stats: { ...previous.stats, followers: previous.stats.followers + (follow ? 1 : -1) },
        });
      }
      return previous;
    },
    onError: (error, _follow, previous) => {
      if (previous) queryClient.setQueryData(key, previous);
      toast(error.message, 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      // лента «Для вас» зависит от подписок
      queryClient.invalidateQueries({ queryKey: ['pins', 'home', 'following'] });
    },
  });

  if (user?.username.toLowerCase() === username.toLowerCase()) return null;

  const following = profile.data?.followedByMe ?? false;
  return (
    <button
      type="button"
      className={`button ${following ? 'button--ghost' : 'button--outline'}`}
      disabled={mutation.isPending || (!!user && profile.isPending)}
      onClick={() => (user ? mutation.mutate(!following) : navigate('/login'))}
    >
      {following ? 'Вы подписаны' : 'Подписаться'}
    </button>
  );
}

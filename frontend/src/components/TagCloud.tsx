import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../api/endpoints';

/** Лента популярных тегов; активный тег подсвечивается. */
export function TagCloud({ active, limit = 14 }: { active?: string; limit?: number }) {
  const tags = useQuery({ queryKey: ['tags', limit], queryFn: () => tagsApi.popular(limit), staleTime: 60_000 });
  if (!tags.data?.length) return null;
  return (
    <div className="tag-cloud">
      {tags.data.map((tag) => (
        <Link
          key={tag.name}
          to={`/search?tag=${encodeURIComponent(tag.name)}`}
          className={`chip${tag.name === active ? ' chip--active' : ''}`}
        >
          #{tag.name}
          <small>{tag.pinCount}</small>
        </Link>
      ))}
    </div>
  );
}

package com.foldpapper.tag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, Long> {

    List<Tag> findByNameIn(Collection<String> names);

    /** Популярные теги — для стартовой страницы и подсказок в поиске. */
    @Query(value = """
            SELECT t.name AS name, COUNT(pt.pin_id) AS pin_count
            FROM tags t
                     JOIN pin_tags pt ON pt.tag_id = t.id
            WHERE (:query IS NULL OR t.name LIKE :query || '%')
            GROUP BY t.name
            ORDER BY pin_count DESC, t.name
            LIMIT :limit
            """, nativeQuery = true)
    List<TagUsage> findPopular(@Param("query") String query, @Param("limit") int limit);

    /** Самые частые теги в пинах автора — для профиля. */
    @Query(value = """
            SELECT t.name
            FROM tags t
                     JOIN pin_tags pt ON pt.tag_id = t.id
                     JOIN pins p ON p.id = pt.pin_id
            WHERE p.author_id = :authorId
            GROUP BY t.name
            ORDER BY COUNT(*) DESC, t.name
            LIMIT :limit
            """, nativeQuery = true)
    List<String> findTopNamesByAuthor(@Param("authorId") UUID authorId, @Param("limit") int limit);

    interface TagUsage {
        String getName();

        long getPinCount();
    }
}

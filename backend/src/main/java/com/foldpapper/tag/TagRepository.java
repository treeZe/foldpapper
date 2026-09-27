package com.foldpapper.tag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

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

    interface TagUsage {
        String getName();

        long getPinCount();
    }
}

package com.foldpapper.tag;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TagService {

    /** Максимум тегов на один пин. */
    private static final int MAX_TAGS_PER_PIN = 20;
    private static final int MAX_TAG_LENGTH = 50;
    private static final Pattern DISALLOWED = Pattern.compile("[^\\p{L}\\p{Nd} _-]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    /** Приводит тег к каноничному виду: "#Острый Перец!" -> "острый перец". */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = DISALLOWED.matcher(raw.toLowerCase(Locale.ROOT)).replaceAll(" ");
        normalized = WHITESPACE.matcher(normalized).replaceAll(" ").trim();
        if (normalized.length() > MAX_TAG_LENGTH) {
            normalized = normalized.substring(0, MAX_TAG_LENGTH).trim();
        }
        return normalized;
    }

    /** Находит существующие теги и создаёт отсутствующие. */
    @Transactional
    public Set<Tag> resolveOrCreate(Collection<String> rawNames) {
        if (rawNames == null || rawNames.isEmpty()) {
            return Set.of();
        }

        Set<String> names = rawNames.stream()
                .map(TagService::normalize)
                .filter(StringUtils::hasText)
                .limit(MAX_TAGS_PER_PIN)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (names.isEmpty()) {
            return Set.of();
        }

        Map<String, Tag> existing = tagRepository.findByNameIn(names).stream()
                .collect(Collectors.toMap(Tag::getName, Function.identity()));

        List<Tag> created = names.stream()
                .filter(name -> !existing.containsKey(name))
                .map(Tag::new)
                .toList();

        Set<Tag> result = new LinkedHashSet<>(existing.values());
        result.addAll(tagRepository.saveAll(created));
        return result;
    }

    @Transactional(readOnly = true)
    public List<TagRepository.TagUsage> popular(String query, int limit) {
        String normalized = normalize(query);
        return tagRepository.findPopular(StringUtils.hasText(normalized) ? normalized : null,
                Math.max(1, Math.min(limit, 100)));
    }
}

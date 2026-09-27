package com.foldpapper.tag;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tags")
@Tag(name = "Tags", description = "Популярные теги и подсказки")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    @Operation(summary = "Популярные теги, опционально с фильтром по префиксу")
    public List<TagView> popular(@RequestParam(required = false) String q,
                                 @RequestParam(defaultValue = "20") int limit) {
        return tagService.popular(q, limit).stream()
                .map(usage -> new TagView(usage.getName(), usage.getPinCount()))
                .toList();
    }

    public record TagView(String name, long pinCount) {
    }
}

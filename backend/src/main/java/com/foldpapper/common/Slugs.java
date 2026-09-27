package com.foldpapper.common;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Превращает заголовок в slug, включая транслитерацию кириллицы. */
public final class Slugs {

    private static final Map<Character, String> TRANSLIT = Map.ofEntries(
            Map.entry('а', "a"), Map.entry('б', "b"), Map.entry('в', "v"), Map.entry('г', "g"),
            Map.entry('д', "d"), Map.entry('е', "e"), Map.entry('ё', "e"), Map.entry('ж', "zh"),
            Map.entry('з', "z"), Map.entry('и', "i"), Map.entry('й', "y"), Map.entry('к', "k"),
            Map.entry('л', "l"), Map.entry('м', "m"), Map.entry('н', "n"), Map.entry('о', "o"),
            Map.entry('п', "p"), Map.entry('р', "r"), Map.entry('с', "s"), Map.entry('т', "t"),
            Map.entry('у', "u"), Map.entry('ф', "f"), Map.entry('х', "h"), Map.entry('ц', "c"),
            Map.entry('ч', "ch"), Map.entry('ш', "sh"), Map.entry('щ', "sch"), Map.entry('ъ', ""),
            Map.entry('ы', "y"), Map.entry('ь', ""), Map.entry('э', "e"), Map.entry('ю', "yu"),
            Map.entry('я', "ya"));

    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");
    private static final Pattern EDGE_DASHES = Pattern.compile("(^-+)|(-+$)");

    private Slugs() {
    }

    public static String slugify(String raw, String fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        StringBuilder transliterated = new StringBuilder(raw.length());
        for (char symbol : raw.toLowerCase(Locale.ROOT).toCharArray()) {
            transliterated.append(TRANSLIT.getOrDefault(symbol, String.valueOf(symbol)));
        }
        String slug = NON_SLUG.matcher(transliterated).replaceAll("-");
        slug = EDGE_DASHES.matcher(slug).replaceAll("");
        if (slug.length() > 80) {
            slug = EDGE_DASHES.matcher(slug.substring(0, 80)).replaceAll("");
        }
        return slug.isBlank() ? fallback : slug;
    }
}

package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.regex.Pattern;

@Service
public class WordIdService {

    private static final Pattern SPLIT_PATTERN = Pattern.compile("\\s?[,/(-]");
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{M}");
    private static final Pattern NON_ALPHA_PATTERN = Pattern.compile("[^a-z\\s-]");
    private static final Pattern MULTI_HYPHEN_PATTERN = Pattern.compile("-+");
    private static final Pattern GERMAN_ARTICLE_PATTERN = Pattern.compile("^(der|die|das|ein|eine|einen|einem|einer|eines)\\s+", Pattern.CASE_INSENSITIVE);
    private static final Pattern HUNGARIAN_ARTICLE_PATTERN = Pattern.compile("^(a|az|egy)\\s+", Pattern.CASE_INSENSITIVE);

    public String generateWordId(String germanWord, String hungarianWord) {
        final String normalizedGerman = normalizeGermanWord(germanWord);
        final String normalizedHungarian = normalizeWord(stripHungarianArticle(hungarianWord));
        return normalizedGerman + "-" + normalizedHungarian;
    }

    public String normalizeGermanWord(String germanWord) {
        return normalizeWord(stripGermanArticle(germanWord));
    }

    private String stripGermanArticle(String word) {
        if (word == null || word.isBlank()) {
            return word;
        }
        return GERMAN_ARTICLE_PATTERN.matcher(word.trim()).replaceFirst("");
    }

    private String stripHungarianArticle(String word) {
        if (word == null || word.isBlank()) {
            return word;
        }
        return HUNGARIAN_ARTICLE_PATTERN.matcher(word.trim()).replaceFirst("");
    }

    private String normalizeWord(String word) {
        if (word == null || word.isBlank()) {
            return "";
        }

        String firstPart = SPLIT_PATTERN.split(word)[0].trim();

        String normalized = Normalizer.normalize(firstPart, Normalizer.Form.NFD);
        normalized = DIACRITICS_PATTERN.matcher(normalized).replaceAll("");

        normalized = normalized.toLowerCase();

        normalized = NON_ALPHA_PATTERN.matcher(normalized).replaceAll("");

        normalized = normalized.replace(" ", "-");

        normalized = MULTI_HYPHEN_PATTERN.matcher(normalized).replaceAll("-");

        normalized = normalized.replaceAll("^-+|-+$", "");

        return normalized;
    }
}

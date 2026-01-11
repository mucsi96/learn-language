package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class WordIdService {

    private static final Pattern SPLIT_PATTERN = Pattern.compile("\\s?[,/(-]");
    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{M}");
    private static final Pattern NON_ASCII_PATTERN = Pattern.compile("[^a-z-]");
    private static final Set<String> GERMAN_ARTICLES = Set.of("der", "die", "das", "ein", "eine", "einen", "einem", "einer", "eines");
    private static final Set<String> HUNGARIAN_ARTICLES = Set.of("a", "az", "egy");

    public String generateWordId(String word) {
        return SPLIT_PATTERN.split(word)[0].trim().toLowerCase().replace(" ", "-");
    }

    public String generateMultilingualWordId(String germanWord, String hungarianWord) {
        String germanPart = normalizeWord(germanWord, GERMAN_ARTICLES);
        String hungarianPart = normalizeWord(hungarianWord, HUNGARIAN_ARTICLES);
        return germanPart + "-" + hungarianPart;
    }

    public String generateGermanBaseId(String germanWord) {
        return normalizeWord(germanWord, GERMAN_ARTICLES);
    }

    private String normalizeWord(String word, Set<String> articles) {
        String normalized = SPLIT_PATTERN.split(word)[0].trim().toLowerCase();
        String[] parts = normalized.split("\\s+");
        if (parts.length > 1 && articles.contains(parts[0])) {
            normalized = String.join("-", java.util.Arrays.copyOfRange(parts, 1, parts.length));
        } else {
            normalized = normalized.replace(" ", "-");
        }
        return removeSpecialCharacters(normalized);
    }

    private String removeSpecialCharacters(String text) {
        String decomposed = Normalizer.normalize(text, Normalizer.Form.NFD);
        String withoutDiacritics = DIACRITICS_PATTERN.matcher(decomposed).replaceAll("");
        return NON_ASCII_PATTERN.matcher(withoutDiacritics).replaceAll("");
    }
}

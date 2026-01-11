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

    public String generateWordId(String germanWord, String hungarianWord) {
        String normalizedGerman = normalizeWord(germanWord);
        String normalizedHungarian = normalizeWord(hungarianWord);
        return normalizedGerman + "-" + normalizedHungarian;
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

package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class WordIdService {

    private static final Pattern SPLIT_PATTERN = Pattern.compile("\\s?[,/(-]");
    private static final Set<String> GERMAN_ARTICLES = Set.of("der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines");
    private static final Set<String> HUNGARIAN_ARTICLES = Set.of("a", "az", "egy");

    public String normalizeWord(String word, Set<String> articlesToRemove) {
        if (word == null || word.isBlank()) {
            return "";
        }

        String firstPart = SPLIT_PATTERN.split(word)[0].trim().toLowerCase();

        String normalized = Normalizer.normalize(firstPart, Normalizer.Form.NFD);
        StringBuilder result = new StringBuilder();

        for (char c : normalized.toCharArray()) {
            if (c >= 'a' && c <= 'z') {
                result.append(c);
            } else if (c == ' ' || c == '-') {
                result.append('-');
            }
        }

        String wordId = result.toString().replaceAll("-+", "-");
        if (wordId.startsWith("-")) {
            wordId = wordId.substring(1);
        }
        if (wordId.endsWith("-")) {
            wordId = wordId.substring(0, wordId.length() - 1);
        }

        for (String article : articlesToRemove) {
            if (wordId.startsWith(article + "-")) {
                wordId = wordId.substring(article.length() + 1);
                break;
            }
        }

        return wordId;
    }

    public String generateWordId(String germanWord, String hungarianWord) {
        String normalizedGerman = normalizeWord(germanWord, GERMAN_ARTICLES);
        String normalizedHungarian = normalizeWord(hungarianWord, HUNGARIAN_ARTICLES);

        if (normalizedGerman.isEmpty() && normalizedHungarian.isEmpty()) {
            return "";
        }
        if (normalizedHungarian.isEmpty()) {
            return normalizedGerman;
        }
        if (normalizedGerman.isEmpty()) {
            return normalizedHungarian;
        }

        return normalizedGerman + "-" + normalizedHungarian;
    }

    @Deprecated
    public String generateWordId(String word) {
        return normalizeWord(word, GERMAN_ARTICLES);
    }
}

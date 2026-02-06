package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.KnownWord;
import io.github.mucsi96.learnlanguage.model.KnownWordResponse;
import io.github.mucsi96.learnlanguage.repository.KnownWordRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class KnownWordService {

    private final KnownWordRepository knownWordRepository;

    public List<KnownWordResponse> getAllKnownWords() {
        return knownWordRepository.findAll().stream()
                .sorted(Comparator.comparing(KnownWord::getWord))
                .map(kw -> KnownWordResponse.builder()
                        .word(kw.getWord())
                        .hungarianTranslation(kw.getHungarianTranslation())
                        .build())
                .toList();
    }

    public int getKnownWordsCount() {
        return (int) knownWordRepository.count();
    }

    public boolean isWordKnown(String word) {
        return knownWordRepository.existsByWord(word.toLowerCase().trim());
    }

    @Transactional
    public int importFromCsv(String csvText) {
        Map<String, String> existingWords = knownWordRepository.findAll().stream()
                .collect(Collectors.toMap(KnownWord::getWord, kw -> kw.getHungarianTranslation() != null ? kw.getHungarianTranslation() : ""));

        List<String> lines = Arrays.stream(csvText.split("[\\n\\r]+"))
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .toList();

        List<KnownWord> newWords = lines.stream()
                .map(line -> {
                    String[] parts = line.split(",", 2);
                    String word = parts[0].trim().toLowerCase();
                    String translation = parts.length > 1 ? parts[1].trim() : null;
                    return new String[] { word, translation };
                })
                .filter(parts -> !parts[0].isEmpty())
                .filter(parts -> !existingWords.containsKey(parts[0]))
                .map(parts -> KnownWord.builder()
                        .word(parts[0])
                        .hungarianTranslation(parts[1])
                        .build())
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                KnownWord::getWord,
                                kw -> kw,
                                (existing, replacement) -> existing
                        ),
                        map -> map.values().stream().toList()
                ));

        knownWordRepository.saveAll(newWords);
        return newWords.size();
    }

    @Transactional
    public void deleteWord(String word) {
        knownWordRepository.findByWord(word.toLowerCase().trim())
                .ifPresent(knownWordRepository::delete);
    }

    @Transactional
    public void deleteAllWords() {
        knownWordRepository.deleteAll();
    }
}

package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.KnownWord;
import io.github.mucsi96.learnlanguage.repository.KnownWordRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class KnownWordService {

    private final KnownWordRepository knownWordRepository;
    private final WordIdService wordIdService;

    public List<String> getAllKnownWords() {
        return knownWordRepository.findAll().stream()
                .map(KnownWord::getWord)
                .sorted()
                .toList();
    }

    public int getKnownWordsCount() {
        return (int) knownWordRepository.count();
    }

    public boolean isWordIdKnown(String wordId) {
        return knownWordRepository.existsByWord(wordId.toLowerCase().trim());
    }

    @Transactional
    public int addWordIds(List<String> wordIds) {
        Set<String> existingWordIds = knownWordRepository.findAll().stream()
                .map(KnownWord::getWord)
                .collect(Collectors.toSet());

        List<KnownWord> newWords = wordIds.stream()
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(wordId -> !wordId.isEmpty())
                .filter(wordId -> !existingWordIds.contains(wordId))
                .distinct()
                .map(wordId -> KnownWord.builder().word(wordId).build())
                .toList();

        knownWordRepository.saveAll(newWords);
        return newWords.size();
    }

    @Transactional
    public int importFromText(String text) {
        List<String> wordIds = Arrays.stream(text.split("[,\\n\\r\\t;]+"))
                .map(String::trim)
                .filter(entry -> !entry.isEmpty())
                .map(this::parseEntry)
                .toList();

        return addWordIds(wordIds);
    }

    private String parseEntry(String entry) {
        if (entry.contains(" - ")) {
            String[] parts = entry.split(" - ", 2);
            if (parts.length == 2) {
                return wordIdService.generateMultilingualWordId(parts[0].trim(), parts[1].trim());
            }
        }
        return entry.toLowerCase();
    }

    @Transactional
    public void deleteWord(String wordId) {
        knownWordRepository.findByWord(wordId.toLowerCase().trim())
                .ifPresent(knownWordRepository::delete);
    }

    @Transactional
    public void deleteAllWords() {
        knownWordRepository.deleteAll();
    }
}

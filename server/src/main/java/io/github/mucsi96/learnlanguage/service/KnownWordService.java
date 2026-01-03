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

    public List<String> getAllKnownWords() {
        return knownWordRepository.findAll().stream()
                .map(KnownWord::getWord)
                .sorted()
                .toList();
    }

    public int getKnownWordsCount() {
        return (int) knownWordRepository.count();
    }

    public boolean isWordKnown(String word) {
        return knownWordRepository.existsByWord(word.toLowerCase().trim());
    }

    @Transactional
    public int addWords(List<String> words) {
        Set<String> existingWords = knownWordRepository.findAll().stream()
                .map(KnownWord::getWord)
                .collect(Collectors.toSet());

        List<KnownWord> newWords = words.stream()
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(word -> !word.isEmpty())
                .filter(word -> !existingWords.contains(word))
                .distinct()
                .map(word -> KnownWord.builder().word(word).build())
                .toList();

        knownWordRepository.saveAll(newWords);
        return newWords.size();
    }

    @Transactional
    public int importFromText(String text) {
        List<String> words = Arrays.stream(text.split("[,\\n\\r\\t;]+"))
                .map(String::trim)
                .filter(word -> !word.isEmpty())
                .toList();

        return addWords(words);
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

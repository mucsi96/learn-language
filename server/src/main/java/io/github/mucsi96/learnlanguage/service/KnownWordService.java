package io.github.mucsi96.learnlanguage.service;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.KnownWord;
import io.github.mucsi96.learnlanguage.model.KnownWordEntry;
import io.github.mucsi96.learnlanguage.repository.KnownWordRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class KnownWordService {

    private final KnownWordRepository knownWordRepository;

    public List<KnownWordEntry> getAllKnownWords() {
        return knownWordRepository.findAll().stream()
                .map(kw -> KnownWordEntry.builder()
                        .wordId(kw.getWordId())
                        .germanWord(kw.getGermanWord())
                        .hungarianTranslation(kw.getHungarianTranslation())
                        .build())
                .sorted(Comparator.comparing(KnownWordEntry::getGermanWord))
                .toList();
    }

    public int getKnownWordsCount() {
        return (int) knownWordRepository.count();
    }

    public boolean isWordKnown(String wordId) {
        return knownWordRepository.existsByWordId(wordId);
    }

    @Transactional
    public int addWords(List<KnownWordEntry> words) {
        Set<String> existingWordIds = knownWordRepository.findAll().stream()
                .map(KnownWord::getWordId)
                .collect(Collectors.toSet());

        List<KnownWord> newWords = words.stream()
                .filter(entry -> entry.getWordId() != null && !entry.getWordId().isEmpty())
                .filter(entry -> !existingWordIds.contains(entry.getWordId()))
                .map(entry -> KnownWord.builder()
                        .wordId(entry.getWordId())
                        .germanWord(entry.getGermanWord())
                        .hungarianTranslation(entry.getHungarianTranslation())
                        .build())
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(KnownWord::getWordId, kw -> kw, (a, b) -> a),
                        map -> map.values().stream().toList()
                ));

        knownWordRepository.saveAll(newWords);
        return newWords.size();
    }

    @Transactional
    public void deleteWord(String wordId) {
        knownWordRepository.findByWordId(wordId)
                .ifPresent(knownWordRepository::delete);
    }

    @Transactional
    public void deleteAllWords() {
        knownWordRepository.deleteAll();
    }
}

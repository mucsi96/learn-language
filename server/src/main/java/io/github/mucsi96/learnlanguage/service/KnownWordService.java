package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.KnownWord;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.KnownWordResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.KnownWordRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class KnownWordService {

    private final KnownWordRepository knownWordRepository;
    private final CardRepository cardRepository;
    private final SourceRepository sourceRepository;

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

    public List<String> getExportWords(List<String> groupIds) {
        final List<Card> cards = resolveCards(groupIds);

        final Stream<String> cardWords = cards.stream()
                .map(Card::getData)
                .filter(Objects::nonNull)
                .map(CardData::getWord)
                .filter(Objects::nonNull);

        final Stream<String> knownWords = knownWordRepository.findAll().stream()
                .map(KnownWord::getWord);

        return Stream.concat(cardWords, knownWords)
                .map(word -> word.toLowerCase().trim())
                .filter(word -> !word.isEmpty())
                .distinct()
                .sorted()
                .toList();
    }

    private List<Card> resolveCards(List<String> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return cardRepository.findAll();
        }

        final List<String> sourceIds = sourceRepository.findByGroup_IdIn(groupIds).stream()
                .map(Source::getId)
                .toList();

        return sourceIds.isEmpty() ? List.of() : cardRepository.findBySource_IdIn(sourceIds);
    }

    public Set<String> getKnownWordSet() {
        return knownWordRepository.findAll().stream()
                .map(KnownWord::getWord)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Transactional
    public boolean addKnownWord(String word) {
        final String normalizedWord = word.toLowerCase().trim();

        if (normalizedWord.isEmpty() || knownWordRepository.existsByWord(normalizedWord)) {
            return false;
        }

        knownWordRepository.save(KnownWord.builder().word(normalizedWord).build());
        return true;
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

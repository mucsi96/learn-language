package io.github.mucsi96.learnlanguage.service;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.ArrayList;
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
    private final WordIdService wordIdService;

    public List<KnownWordEntry> getAllKnownWords() {
        return knownWordRepository.findAllByOrderByGermanAsc().stream()
                .map(kw -> KnownWordEntry.builder()
                        .id(kw.getId())
                        .german(kw.getGerman())
                        .hungarian(kw.getHungarian())
                        .build())
                .toList();
    }

    public int getKnownWordsCount() {
        return (int) knownWordRepository.count();
    }

    public boolean isWordKnown(String id) {
        return knownWordRepository.existsById(id);
    }

    public boolean isWordKnownByTranslations(String germanWord, String hungarianWord) {
        String id = wordIdService.generateWordId(germanWord, hungarianWord);
        return knownWordRepository.existsById(id);
    }

    @Transactional
    public int addWords(List<KnownWordEntry> entries) {
        Set<String> existingIds = knownWordRepository.findAll().stream()
                .map(KnownWord::getId)
                .collect(Collectors.toSet());

        List<KnownWord> newWords = entries.stream()
                .filter(entry -> entry.getGerman() != null && !entry.getGerman().isBlank())
                .filter(entry -> entry.getHungarian() != null && !entry.getHungarian().isBlank())
                .map(entry -> {
                    String id = wordIdService.generateWordId(entry.getGerman(), entry.getHungarian());
                    return KnownWord.builder()
                            .id(id)
                            .german(entry.getGerman().trim())
                            .hungarian(entry.getHungarian().trim())
                            .build();
                })
                .filter(kw -> !kw.getId().isEmpty())
                .filter(kw -> !existingIds.contains(kw.getId()))
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(KnownWord::getId, kw -> kw, (a, b) -> a),
                        map -> new ArrayList<>(map.values())
                ));

        knownWordRepository.saveAll(newWords);
        return newWords.size();
    }

    @Transactional
    public int importFromCsv(String csvText) {
        List<KnownWordEntry> entries = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new StringReader(csvText))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmedLine = line.trim();
                if (trimmedLine.isEmpty()) {
                    continue;
                }

                String[] parts = trimmedLine.split("[,;\\t]", 2);
                if (parts.length >= 2) {
                    String german = parts[0].trim();
                    String hungarian = parts[1].trim();
                    if (!german.isEmpty() && !hungarian.isEmpty()) {
                        entries.add(KnownWordEntry.builder()
                                .german(german)
                                .hungarian(hungarian)
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV", e);
        }

        return addWords(entries);
    }

    @Transactional
    public void deleteWord(String id) {
        knownWordRepository.deleteById(id);
    }

    @Transactional
    public void deleteAllWords() {
        knownWordRepository.deleteAll();
    }
}

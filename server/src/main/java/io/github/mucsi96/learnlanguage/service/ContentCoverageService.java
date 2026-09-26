package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ContentCoverageService {
    private final JdbcClient jdbc;
    private final SourceService sources;
    private final KnownWordService knownWords;

    public record MatchingCard(String id, String word, String readiness, int reviews) {}

    public Map<String, List<MatchingCard>> cards(String sourceId) {
        return jdbc.sql("""
                SELECT id, data->>'word' AS word, readiness, reps FROM learn_language.cards
                WHERE source_id IN (:sources) AND type = 'VOCABULARY' AND data->>'word' IS NOT NULL
                """).param("sources", sources.getDetectionSourceIds(sourceId))
                .query((row, index) -> new MatchingCard(row.getString("id"), row.getString("word"),
                        row.getString("readiness"), row.getInt("reps"))).list().stream()
                .flatMap(card -> ContentTextService.matchingKeys(card.word()).stream().map(key -> Map.entry(key, card)))
                .collect(Collectors.groupingBy(Map.Entry::getKey,
                        Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
    }

    public List<WordCoverage> coverage(ContentItem item, Map<String, List<MatchingCard>> cards) {
        if (!item.status().equals("prepared")) return List.of();
        final var known = knownWords.getKnownWordSet().stream().flatMap(word -> ContentTextService.matchingKeys(word).stream())
                .collect(Collectors.toUnmodifiableSet());
        return item.preparation().words().stream().map(word -> {
            final String key = ContentTextService.lexicalKey(word.lemma());
            final List<MatchingCard> matches = cards.getOrDefault(key, List.of());
            final String status = known.contains(key) || matches.stream().anyMatch(card -> card.readiness().equals("KNOWN")) ? "satisfied"
                    : matches.isEmpty() ? "missing"
                    : matches.stream().anyMatch(card -> card.readiness().equals("READY") && card.reviews() > 0) ? "satisfied"
                    : matches.stream().anyMatch(card -> card.readiness().equals("READY")) ? "unreviewed" : "not_ready";
            return new WordCoverage(key, word, status, matches.stream().map(MatchingCard::id).toList());
        }).toList();
    }

    public boolean unlocked(ContentItem item, List<WordCoverage> words) {
        return item.status().equals("prepared") && words.stream().allMatch(word -> word.status().equals("satisfied"));
    }
}

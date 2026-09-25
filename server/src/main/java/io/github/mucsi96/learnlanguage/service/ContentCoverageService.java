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

    public record MatchingCard(String id, String word, String readiness, int reviews) {}

    public Map<String, List<MatchingCard>> cards(String sourceId) {
        return jdbc.sql("""
                SELECT id, data->>'word' AS word, readiness, reps FROM learn_language.cards
                WHERE source_id IN (:sources) AND type = 'VOCABULARY' AND data->>'word' IS NOT NULL
                """).param("sources", sources.getDetectionSourceIds(sourceId))
                .query((row, index) -> new MatchingCard(row.getString("id"), row.getString("word"),
                        row.getString("readiness"), row.getInt("reps"))).list().stream()
                .collect(Collectors.groupingBy(card -> ContentTextService.lexicalKey(card.word())));
    }

    public List<WordCoverage> coverage(ContentItem item, Map<String, List<MatchingCard>> cards) {
        if (!item.status().equals("prepared")) return List.of();
        return item.preparation().words().stream().map(word -> {
            final String key = ContentTextService.lexicalKey(word.lemma());
            final List<MatchingCard> matches = cards.getOrDefault(key, List.of());
            final String status = matches.isEmpty() ? "missing"
                    : matches.stream().anyMatch(card -> card.readiness().equals("READY") && card.reviews() > 0) ? "satisfied"
                    : matches.stream().anyMatch(card -> card.readiness().equals("READY")) ? "unreviewed" : "not_ready";
            return new WordCoverage(key, word, status, matches.stream().map(MatchingCard::id).toList());
        }).toList();
    }

    public boolean unlocked(List<WordCoverage> words) {
        return !words.isEmpty() && words.stream().allMatch(word -> word.status().equals("satisfied"));
    }
}

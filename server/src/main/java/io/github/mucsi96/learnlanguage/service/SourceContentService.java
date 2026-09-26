package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.extension.SourceExtensionRegistry;
import io.github.mucsi96.learnlanguage.model.*;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SourceContentService {
    private final SourceService sources;
    private final SourceExtensionRegistry extensions;
    private final ContentStore store;
    private final ContentCoverageService coverage;
    private final CardService cards;
    private final JdbcClient jdbc;
    private final KnownWordService knownWords;

    public Source source(String id) {
        final Source source = sources.getSourceById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source not found"));
        if (source.getSourceType() != SourceType.EXTENSION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source does not use an extension");
        }
        extensions.require(source.getExtensionId());
        return source;
    }

    public synchronized List<ContentItem> list(String sourceId, boolean refresh) {
        final Source source = source(sourceId);
        if (refresh || !store.discoveryFresh(source.getExtensionId(), extensions.require(source.getExtensionId()).discoveryInterval())) {
            store.discovered(source.getExtensionId(), extensions.require(source.getExtensionId()).discoverContent());
        }
        return store.list(source.getExtensionId());
    }

    public ContentItem require(String sourceId, UUID contentId) {
        final ContentItem item = store.require(contentId);
        if (!item.extensionId().equals(source(sourceId).getExtensionId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Content not found in this source");
        }
        return item;
    }

    public void prepare(String sourceId, UUID contentId) {
        final ContentItem item = require(sourceId, contentId);
        if (item.descriptor().transcriptUrl() == null || item.descriptor().matchError() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, item.descriptor().matchError());
        }
        store.enqueue(contentId);
    }

    public ContentView view(ContentItem item, Map<String, List<ContentCoverageService.MatchingCard>> matching, Progress progress) {
        final var words = coverage.coverage(item, matching);
        final var descriptor = item.descriptor();
        final var publicMetadata = new ContentDescriptor(descriptor.externalId(), descriptor.title(), descriptor.number(),
                descriptor.durationSeconds(), descriptor.languageLevel(), null, descriptor.transcriptUrl(), descriptor.transcriptMediaType(), descriptor.matchError(), null);
        return new ContentView(item.id(), publicMetadata, item.status(), item.error(),
                item.preparation() == null ? null : item.preparation().transcript(), words, coverage.unlocked(item, words), progress);
    }

    @Transactional
    public void createDrafts(String sourceId, UUID contentId, DraftRequest request) {
        final ContentItem item = require(sourceId, contentId);
        final Source source = source(sourceId);
        if (!item.status().equals("prepared") || request.wordKeys() == null || request.wordKeys().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select prepared vocabulary words");
        }
        final String scope = source.getGroup() == null ? sourceId : source.getGroup().getId();
        jdbc.sql("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))").param("scope", scope).query().listOfRows();
        final var words = coverage.coverage(item, coverage.cards(sourceId));
        if (request.wordKeys().stream().anyMatch(key -> words.stream().noneMatch(word -> word.key().equals(key)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown vocabulary selection");
        }
        words.stream().filter(word -> request.wordKeys().contains(word.key()) && word.status().equals("missing"))
                .forEach(word -> cards.saveCard(draft(source, word)));
    }

    @Transactional
    public void markKnown(String sourceId, UUID contentId, DraftRequest request) {
        final ContentItem item = require(sourceId, contentId);
        if (!item.status().equals("prepared") || request.wordKeys() == null || request.wordKeys().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select prepared vocabulary words");
        }
        final var words = coverage.coverage(item, coverage.cards(sourceId));
        if (request.wordKeys().stream().anyMatch(key -> words.stream().noneMatch(word -> word.key().equals(key)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown vocabulary selection");
        }
        words.stream().filter(word -> request.wordKeys().contains(word.key()) && word.status().equals("missing"))
                .forEach(word -> knownWords.addKnownWord(word.word().lemma()));
    }

    private Card draft(Source source, WordCoverage candidate) {
        final VocabularyWord word = candidate.word();
        final String id = "content-" + ContentAssetService.key(source.getId() + "\n" + candidate.key());
        return Card.builder().id(id).source(source).sourcePageNumber(1).type(CardType.VOCABULARY)
                .data(CardData.builder().word(word.lemma()).type(word.wordType().toUpperCase(java.util.Locale.ROOT))
                        .forms(word.forms()).translation(Map.of())
                        .examples(word.examples().stream().map(example -> ExampleData.builder().de(example).build()).toList()).build())
                .readiness(CardReadiness.DRAFT).state("NEW").due(LocalDateTime.now())
                .stability(0f).difficulty(0f).elapsedDays(0f).scheduledDays(0f).learningSteps(0).reps(0).lapses(0).build();
    }
}

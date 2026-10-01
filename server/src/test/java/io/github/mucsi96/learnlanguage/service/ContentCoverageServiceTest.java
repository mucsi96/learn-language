package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import io.github.mucsi96.learnlanguage.model.ContentModels.ContentItem;
import io.github.mucsi96.learnlanguage.model.ContentModels.Preparation;
import io.github.mucsi96.learnlanguage.model.ContentModels.VocabularyWord;
import io.github.mucsi96.learnlanguage.service.ContentCoverageService.MatchingCard;

class ContentCoverageServiceTest {

    @ParameterizedTest
    @CsvSource({
            "READY, 0, false, unreviewed, false",
            "READY, 1, false, unreviewed, false",
            "READY, 2, false, satisfied, true",
            "READY, 3, false, satisfied, true",
            "DRAFT, 2, false, not_ready, false",
            "KNOWN, 0, false, satisfied, true",
            "READY, 0, true, satisfied, true"
    })
    void requiresTwoReviewsUnlessTheWordIsKnown(String readiness, int reviews, boolean known,
            String expectedStatus, boolean expectedUnlocked) {
        final KnownWordService knownWords = mock(KnownWordService.class);
        when(knownWords.getKnownWordSet()).thenReturn(known ? Set.of("Haus") : Set.of());
        final ContentCoverageService service = new ContentCoverageService(null, null, knownWords);
        final VocabularyWord word = new VocabularyWord("Haus", "noun", "das", List.of(), List.of(), List.of());
        final ContentItem item = new ContentItem(UUID.randomUUID(), "stories", null,
                Preparation.builder().words(List.of(word)).build(), "prepared", null, null);
        final var cards = Map.of(ContentTextService.lexicalKey("Haus"),
                List.of(new MatchingCard("haus", "das Haus", readiness, reviews)));

        final var coverage = service.coverage(item, cards);

        assertThat(coverage).extracting(value -> value.status()).containsExactly(expectedStatus);
        assertThat(service.unlocked(item, coverage)).isEqualTo(expectedUnlocked);
    }
}

package io.github.mucsi96.learnlanguage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.IntStream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionCardRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;

class StudySessionServiceTest {

    private final StudySessionService service = new StudySessionService(
            mock(CardRepository.class), mock(SourceRepository.class), mock(StudySessionRepository.class),
            mock(StudySessionCardRepository.class), mock(ReviewLogRepository.class));

    @ParameterizedTest
    @CsvSource({ "true,1", "false,1", "true,4", "false,4", "true,5", "false,5" })
    void alternatesFromEitherRandomStarterWithoutLosingCards(boolean userStarts, int cardCount) {
        final var cards = IntStream.range(0, cardCount)
                .mapToObj(i -> Card.builder().id("card-" + i).state("NEW").build())
                .toList();
        final var partner = LearningPartner.builder().id(1).name("Alice").build();
        final var random = mock(ThreadLocalRandom.class);
        when(random.nextBoolean()).thenReturn(userStarts);

        try (final var mockedRandom = mockStatic(ThreadLocalRandom.class)) {
            mockedRandom.when(ThreadLocalRandom::current).thenReturn(random);

            final var assigned = service.assignCardsSmartly(cards, StudySession.builder().build(), partner,
                    cardCount, 0);

            assertEquals(cardCount, assigned.size());
            assertEquals(cardCount, assigned.stream().map(card -> card.getCard().getId()).distinct().count());
            IntStream.range(0, cardCount).forEach(i -> {
                assertEquals(i, assigned.get(i).getPosition());
                assertEquals((i % 2 == 0) == userStarts ? null : partner, assigned.get(i).getLearningPartner());
            });
        }
    }
}

package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySessionCard;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.CardResponse;
import io.github.mucsi96.learnlanguage.model.SessionStatsResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionCardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionCardRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;

import static io.github.mucsi96.learnlanguage.repository.specification.CardSpecifications.isDueForSource;
import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.createdBefore;
import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.createdOnOrAfter;
import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.hasSourceId;

@Service
@RequiredArgsConstructor
public class StudySessionService {

    private static final Duration DUE_CARD_LOOKAHEAD = Duration.ofHours(1);

    private final CardRepository cardRepository;
    private final SourceRepository sourceRepository;
    private final StudySessionRepository studySessionRepository;
    private final StudySessionCardRepository studySessionCardRepository;
    private final ReviewLogRepository reviewLogRepository;

    @Transactional(readOnly = true)
    public Optional<StudySessionResponse> getExistingSession(String sourceId, LocalDateTime startOfDay) {
        return studySessionRepository.findBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay)
                .map(session -> StudySessionResponse.builder()
                        .sessionId(session.getId())
                        .build());
    }

    @Transactional
    public StudySessionResponse createSession(String sourceId, LocalDateTime startOfDay) {
        final Source source = sourceRepository.findByIdWithLock(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found: " + sourceId));

        studySessionRepository.delete(createdBefore(startOfDay));

        final Optional<StudySession> existingSession = studySessionRepository
                .findBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay);
        if (existingSession.isPresent()) {
            return StudySessionResponse.builder()
                    .sessionId(existingSession.get().getId())
                    .build();
        }

        final List<Card> allDueCards = source.getCardLimit() != null
                ? cardRepository.findAll(
                        Specification.where(isDueForSource(sourceId)),
                        PageRequest.of(0, source.getCardLimit(), Sort.by("due"))).getContent()
                : cardRepository.findAll(
                        Specification.where(isDueForSource(sourceId)), Sort.by("due"));
        final List<Card> dueCards = source.getNewCardLimit() != null
                ? applyNewCardLimit(allDueCards, source.getNewCardLimit())
                : allDueCards;
        final Optional<LearningPartner> activePartner = Optional.ofNullable(source.getLearningPartner());

        final String sessionId = UUID.randomUUID().toString();
        final String studyMode = activePartner.isPresent() ? "WITH_PARTNER" : "SOLO";
        final StudySession session = StudySession.builder()
                .id(sessionId)
                .source(source)
                .createdAt(LocalDateTime.now())
                .studyMode(studyMode)
                .cards(new ArrayList<>())
                .build();

        final int effectiveLimit = source.getCardLimit() != null ? source.getCardLimit() : dueCards.size();
        final List<StudySessionCard> sessionCards = activePartner
                .map(partner -> assignCardsSmartly(dueCards, session, partner, effectiveLimit, 0))
                .orElseGet(() -> assignCardsSolo(dueCards, session, effectiveLimit, 0));

        final StudySession sessionWithCards = session.toBuilder()
                .cards(new ArrayList<>(sessionCards))
                .build();

        studySessionRepository.save(sessionWithCards);

        return StudySessionResponse.builder()
                .sessionId(sessionId)
                .build();
    }

    List<StudySessionCard> assignCardsSolo(List<Card> cards, StudySession session, int limit, int positionOffset) {
        final List<Card> limitedCards = cards.stream()
                .limit(limit)
                .toList();

        return IntStream.range(0, limitedCards.size())
                .mapToObj(i -> StudySessionCard.builder()
                        .session(session)
                        .card(limitedCards.get(i))
                        .position(positionOffset + i)
                        .learningPartner(null)
                        .build())
                .toList();
    }

    List<StudySessionCard> assignCardsSmartly(List<Card> cards, StudySession session, LearningPartner partner, int limit,
            int positionOffset) {
        if (cards.isEmpty()) {
            return List.of();
        }

        final double defaultComplexity = 4 * 30;
        final List<String> cardIds = cards.stream().map(Card::getId).toList();
        final Map<String, Double> userComplexities = toComplexityMap(
                reviewLogRepository.findCardComplexitiesWithoutPartner(cardIds));
        final Map<String, Double> partnerComplexities = toComplexityMap(
                reviewLogRepository.findCardComplexitiesWithPartner(cardIds, partner.getId()));

        final List<Card> mostComplexCards = cards.stream()
                .sorted(Comparator.comparingDouble(
                        (Card card) -> Math.max(
                                userComplexities.getOrDefault(card.getId(), defaultComplexity),
                                partnerComplexities.getOrDefault(card.getId(), defaultComplexity)))
                        .reversed())
                .limit(limit)
                .toList();

        final List<Card> sortedByPreference = mostComplexCards.stream()
                .sorted(Comparator.comparingDouble(
                        (Card card) -> userComplexities.getOrDefault(card.getId(), defaultComplexity)
                                - partnerComplexities.getOrDefault(card.getId(), defaultComplexity))
                        .reversed())
                .toList();

        final int userSlots = (sortedByPreference.size() + 1) / 2;

        final List<Card> userCards = sortedByPreference.stream()
                .limit(userSlots)
                .toList();

        final List<Card> partnerCards = sortedByPreference.stream()
                .skip(userSlots)
                .toList();

        final List<Card> partnerCardsReversed = IntStream.range(0, partnerCards.size())
                .mapToObj(i -> partnerCards.get(partnerCards.size() - 1 - i))
                .toList();

        return IntStream.range(0, sortedByPreference.size())
                .mapToObj(i -> StudySessionCard.builder()
                        .session(session)
                        .card(i % 2 == 0 ? userCards.get(i / 2) : partnerCardsReversed.get(i / 2))
                        .position(positionOffset + i)
                        .learningPartner(i % 2 == 0 ? null : partner)
                        .build())
                .toList();
    }

    private List<Card> applyNewCardLimit(List<Card> cards, int newCardLimit) {
        final List<Card> reviewCards = cards.stream()
                .filter(c -> !"NEW".equals(c.getState()))
                .toList();
        final List<Card> limitedNewCards = cards.stream()
                .filter(c -> "NEW".equals(c.getState()))
                .limit(newCardLimit)
                .toList();
        return Stream.concat(reviewCards.stream(), limitedNewCards.stream()).toList();
    }

    private Map<String, Double> toComplexityMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).doubleValue()));
    }

    @Transactional
    public void moveCardToBack(String cardId, String sourceId, LocalDateTime startOfDay, String previousCardState) {
        studySessionRepository.findBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay)
                .flatMap(session -> studySessionRepository.findWithCardsById(session.getId()))
                .ifPresent(session -> session.getCards().stream()
                        .filter(sc -> sc.getCard().getId().equals(cardId))
                        .findFirst()
                        .ifPresent(sessionCard -> {
                            final int maxPosition = session.getCards().stream()
                                    .mapToInt(StudySessionCard::getPosition)
                                    .max()
                                    .orElse(0);
                            sessionCard.setPosition(maxPosition + 1);

                            if ("NEW".equals(previousCardState) && "WITH_PARTNER".equals(session.getStudyMode())) {
                                if (sessionCard.getLearningPartner() != null) {
                                    sessionCard.setLearningPartner(null);
                                } else {
                                    Optional.ofNullable(session.getSource().getLearningPartner())
                                            .ifPresent(sessionCard::setLearningPartner);
                                }
                            }
                        }));
    }

    @Transactional
    public void addCardsToSessions(List<String> cardIds, LocalDateTime startOfDay) {
        final List<Card> cards = cardRepository.findByIdInOrderByIdAsc(cardIds).stream()
                .filter(Card::isReady)
                .toList();

        cards.stream()
                .collect(Collectors.groupingBy(c -> c.getSource().getId()))
                .forEach((sourceId, sourceCards) -> addCardsToSourceSession(sourceCards, sourceId, startOfDay));
    }

    private void addCardsToSourceSession(List<Card> cards, String sourceId, LocalDateTime startOfDay) {
        studySessionRepository.findBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay)
                .flatMap(session -> studySessionRepository.findWithCardsById(session.getId()))
                .ifPresent(session -> {
                    final Source source = session.getSource();
                    final Set<String> existingCardIds = session.getCards().stream()
                            .map(sc -> sc.getCard().getId())
                            .collect(Collectors.toSet());

                    final List<Card> candidateCards = cards.stream()
                            .filter(c -> !existingCardIds.contains(c.getId()))
                            .toList();

                    if (candidateCards.isEmpty()) {
                        return;
                    }

                    final int remainingSlots = source.getCardLimit() != null
                            ? source.getCardLimit() - session.getCards().size()
                            : candidateCards.size();
                    if (remainingSlots <= 0) {
                        return;
                    }

                    final List<Card> slotLimitedCards = candidateCards.stream()
                            .limit(remainingSlots)
                            .toList();

                    final List<Card> limitedCards = source.getNewCardLimit() != null
                            ? applyNewCardLimitForSession(slotLimitedCards, session, source.getNewCardLimit())
                            : slotLimitedCards;

                    if (limitedCards.isEmpty()) {
                        return;
                    }

                    final int positionOffset = session.getCards().stream()
                            .mapToInt(StudySessionCard::getPosition)
                            .max()
                            .orElse(-1) + 1;

                    final Optional<LearningPartner> activePartner = "WITH_PARTNER".equals(session.getStudyMode())
                            ? Optional.ofNullable(session.getSource().getLearningPartner())
                            : Optional.empty();

                    final List<StudySessionCard> newSessionCards = activePartner
                            .map(partner -> assignCardsSmartly(limitedCards, session, partner, limitedCards.size(),
                                    positionOffset))
                            .orElseGet(() -> assignCardsSolo(limitedCards, session, limitedCards.size(), positionOffset));

                    studySessionCardRepository.saveAll(newSessionCards);
                });
    }

    private List<Card> applyNewCardLimitForSession(List<Card> candidates, StudySession session, int newCardLimit) {
        final long existingNewCardCount = session.getCards().stream()
                .filter(sc -> "NEW".equals(sc.getCard().getState()))
                .count();
        final int remainingNewSlots = (int) Math.max(0, newCardLimit - existingNewCardCount);
        return applyNewCardLimit(candidates, remainingNewSlots);
    }

    @Transactional
    public Optional<StudySessionCardResponse> getCurrentCardBySourceId(String sourceId, LocalDateTime startOfDay) {
        return studySessionRepository.findOne(hasSourceId(sourceId).and(createdOnOrAfter(startOfDay)))
                .flatMap(session -> studySessionRepository.findWithCardsById(session.getId()))
                .flatMap(this::findNextCard);
    }

    private Optional<StudySessionCardResponse> findNextCard(StudySession session) {
        final LocalDateTime now = LocalDateTime.now();
        final LocalDateTime lookaheadCutoff = now.plus(DUE_CARD_LOOKAHEAD);

        final List<StudySessionCard> eligibleCards = session.getCards().stream()
                .filter(c -> c.getCard().isReady())
                .filter(c -> !c.getCard().getDue().isAfter(lookaheadCutoff))
                .toList();

        final Optional<StudySessionCard> nextCard = eligibleCards.stream()
                .min(Comparator.comparingInt(StudySessionCard::getPosition));

        return nextCard.map(sessionCard -> {
            final String turnName = sessionCard.getLearningPartner() != null
                    ? sessionCard.getLearningPartner().getName()
                    : getCurrentUserFirstName();

            return StudySessionCardResponse.builder()
                    .card(CardResponse.from(sessionCard.getCard()))
                    .learningPartnerId(sessionCard.getLearningPartner() != null
                            ? sessionCard.getLearningPartner().getId()
                            : null)
                    .turnName(turnName)
                    .studyMode(session.getStudyMode())
                    .build();
        });
    }

    @Transactional(readOnly = true)
    public Optional<SessionStatsResponse> getSessionStats(String sourceId, LocalDateTime startOfDay) {
        return studySessionRepository.findOne(hasSourceId(sourceId).and(createdOnOrAfter(startOfDay)))
                .flatMap(session -> studySessionRepository.findWithCardsById(session.getId()))
                .map(session -> buildSessionStats(session, startOfDay));
    }

    private SessionStatsResponse buildSessionStats(StudySession session, LocalDateTime startOfDay) {
        final List<String> cardIds = session.getCards().stream()
                .map(sc -> sc.getCard().getId())
                .toList();

        final List<ReviewLog> allReviews = reviewLogRepository
                .findByCardIdInAndReviewGreaterThanEqualOrderByIdAsc(cardIds, startOfDay);

        final Map<String, List<ReviewLog>> reviewsPerCard = allReviews.stream()
                .collect(Collectors.groupingBy(
                        rl -> rl.getCard().getId() + ":" + (rl.getLearningPartner() != null ? rl.getLearningPartner().getId() : "self"),
                        LinkedHashMap::new,
                        Collectors.toList()));

        final Set<String> strugglingKeys = reviewsPerCard.entrySet().stream()
                .filter(entry -> entry.getValue().stream().anyMatch(rl -> rl.getRating() < 3))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        final List<ReviewLog> firstReviews = reviewsPerCard.values().stream()
                .map(reviews -> reviews.getFirst())
                .toList();

        final long totalDurationMs = firstReviews.stream()
                .mapToLong(rl -> rl.getReviewDuration() != null ? rl.getReviewDuration() : 0)
                .sum();

        final int reviewCount = firstReviews.size();
        final long averageDurationMs = reviewCount > 0 ? totalDurationMs / reviewCount : 0;

        final int badCount = (int) reviewsPerCard.keySet().stream()
                .filter(strugglingKeys::contains)
                .count();

        final int goodCount = (int) reviewsPerCard.keySet().stream()
                .filter(key -> !strugglingKeys.contains(key))
                .count();

        final List<SessionStatsResponse.PersonStats> personStats;
        if ("WITH_PARTNER".equals(session.getStudyMode())) {
            final String userName = getCurrentUserFirstName();

            final Map<String, List<Map.Entry<String, List<ReviewLog>>>> byPerson = reviewsPerCard.entrySet().stream()
                    .collect(Collectors.groupingBy(
                            entry -> {
                                final ReviewLog first = entry.getValue().getFirst();
                                return first.getLearningPartner() != null ? first.getLearningPartner().getName() : userName;
                            }));

            personStats = byPerson.entrySet().stream()
                    .map(entry -> {
                        final List<Map.Entry<String, List<ReviewLog>>> cardEntries = entry.getValue();
                        final long personTotal = cardEntries.stream()
                                .mapToLong(ce -> {
                                    final ReviewLog first = ce.getValue().getFirst();
                                    return first.getReviewDuration() != null ? first.getReviewDuration() : 0;
                                })
                                .sum();
                        final int personReviewCount = cardEntries.size();
                        final int personBadCount = (int) cardEntries.stream()
                                .filter(ce -> strugglingKeys.contains(ce.getKey()))
                                .count();
                        return SessionStatsResponse.PersonStats.builder()
                                .name(entry.getKey())
                                .totalDurationMs(personTotal)
                                .averageDurationMs(personReviewCount > 0 ? personTotal / personReviewCount : 0)
                                .goodCount(personReviewCount - personBadCount)
                                .badCount(personBadCount)
                                .build();
                    })
                    .toList();
        } else {
            personStats = List.of();
        }

        return SessionStatsResponse.builder()
                .totalDurationMs(totalDurationMs)
                .averageDurationMs(averageDurationMs)
                .goodCount(goodCount)
                .badCount(badCount)
                .studyMode(session.getStudyMode())
                .personStats(personStats)
                .build();
    }

    private String getCurrentUserFirstName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String givenName = jwt.getClaimAsString("given_name");
            if (givenName != null && !givenName.isBlank()) {
                return givenName;
            }
            String name = jwt.getClaimAsString("name");
            if (name != null && !name.isBlank()) {
                return name.split(" ")[0];
            }
        }
        return "Me";
    }
}

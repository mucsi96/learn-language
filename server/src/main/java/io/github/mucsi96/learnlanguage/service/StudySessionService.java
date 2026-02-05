package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

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
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySessionCard;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.CardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionCardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;

import static io.github.mucsi96.learnlanguage.repository.specification.CardSpecifications.isDueForSource;
import static io.github.mucsi96.learnlanguage.repository.specification.ReviewLogSpecifications.hasCardIdIn;
import static io.github.mucsi96.learnlanguage.repository.specification.ReviewLogSpecifications.hasLearningPartnerId;
import static io.github.mucsi96.learnlanguage.repository.specification.ReviewLogSpecifications.hasNoLearningPartner;
import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.createdBefore;

@Service
@RequiredArgsConstructor
public class StudySessionService {

    private static final Duration DUE_CARD_LOOKAHEAD = Duration.ofHours(1);
    private static final int SESSION_CARD_LIMIT = 50;

    private final CardRepository cardRepository;
    private final SourceRepository sourceRepository;
    private final StudySessionRepository studySessionRepository;
    private final ReviewLogRepository reviewLogRepository;
    private final LearningPartnerService learningPartnerService;

    @Transactional(readOnly = true)
    public Optional<StudySessionResponse> getExistingSession(String sourceId, LocalDateTime startOfDay) {
        return studySessionRepository.findBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay)
                .map(session -> StudySessionResponse.builder()
                        .sessionId(session.getId())
                        .build());
    }

    @Transactional
    public StudySessionResponse createSession(String sourceId, LocalDateTime startOfDay) {
        final Source source = sourceRepository.findLockedById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found: " + sourceId));

        studySessionRepository.delete(createdBefore(startOfDay));

        final Optional<StudySession> existingSession = studySessionRepository
                .findBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay);
        if (existingSession.isPresent()) {
            return StudySessionResponse.builder()
                    .sessionId(existingSession.get().getId())
                    .build();
        }

        final List<Card> dueCards = cardRepository.findAll(
                isDueForSource(sourceId), PageRequest.of(0, SESSION_CARD_LIMIT, Sort.by("due"))).getContent();
        final Optional<LearningPartner> activePartner = learningPartnerService.getActivePartner();

        final String sessionId = UUID.randomUUID().toString();
        final String studyMode = activePartner.isPresent() ? "WITH_PARTNER" : "SOLO";
        final StudySession session = StudySession.builder()
                .id(sessionId)
                .source(source)
                .createdAt(LocalDateTime.now())
                .studyMode(studyMode)
                .cards(new ArrayList<>())
                .build();

        final List<StudySessionCard> sessionCards = activePartner
                .map(partner -> assignCardsSmartly(dueCards, session, partner))
                .orElseGet(() -> assignCardsSolo(dueCards, session));

        final StudySession sessionWithCards = session.toBuilder()
                .cards(new ArrayList<>(sessionCards))
                .build();

        studySessionRepository.save(sessionWithCards);

        return StudySessionResponse.builder()
                .sessionId(sessionId)
                .build();
    }

    List<StudySessionCard> assignCardsSolo(List<Card> cards, StudySession session) {
        List<Card> limitedCards = cards.stream()
                .limit(SESSION_CARD_LIMIT)
                .toList();

        return IntStream.range(0, limitedCards.size())
                .mapToObj(i -> StudySessionCard.builder()
                        .session(session)
                        .card(limitedCards.get(i))
                        .position(i)
                        .learningPartner(null)
                        .build())
                .toList();
    }

    List<StudySessionCard> assignCardsSmartly(List<Card> cards, StudySession session, LearningPartner partner) {
        if (cards.isEmpty()) {
            return List.of();
        }

        final List<String> cardIds = cards.stream().map(Card::getId).toList();
        final Map<String, ReviewLog> userReviews = findLatestReviewsByCardIds(cardIds, hasNoLearningPartner());
        final Map<String, ReviewLog> partnerReviews = findLatestReviewsByCardIds(cardIds, hasLearningPartnerId(partner.getId()));

        List<Card> mostComplexCards = cards.stream()
                .sorted(Comparator.comparingDouble(
                        (Card card) -> calculateMaxComplexity(card.getId(), userReviews, partnerReviews))
                        .reversed())
                .limit(SESSION_CARD_LIMIT)
                .toList();

        List<Card> sortedByPreference = mostComplexCards.stream()
                .sorted(Comparator.comparingDouble(
                        (Card card) -> calculatePreference(card.getId(), userReviews, partnerReviews))
                        .reversed())
                .toList();

        int userSlots = (sortedByPreference.size() + 1) / 2;

        List<Card> userCards = sortedByPreference.stream()
                .limit(userSlots)
                .toList();

        List<Card> partnerCards = sortedByPreference.stream()
                .skip(userSlots)
                .toList();

        List<Card> partnerCardsReversed = IntStream.range(0, partnerCards.size())
                .mapToObj(i -> partnerCards.get(partnerCards.size() - 1 - i))
                .toList();

        return IntStream.range(0, sortedByPreference.size())
                .mapToObj(i -> StudySessionCard.builder()
                        .session(session)
                        .card(i % 2 == 0 ? userCards.get(i / 2) : partnerCardsReversed.get(i / 2))
                        .position(i)
                        .learningPartner(i % 2 == 0 ? null : partner)
                        .build())
                .toList();
    }

    double calculateMaxComplexity(String cardId, Map<String, ReviewLog> userReviews,
            Map<String, ReviewLog> partnerReviews) {
        return Math.max(
                calculateComplexity(userReviews.get(cardId)),
                calculateComplexity(partnerReviews.get(cardId)));
    }

    double calculatePreference(String cardId, Map<String, ReviewLog> userReviews,
            Map<String, ReviewLog> partnerReviews) {
        return calculateComplexity(userReviews.get(cardId))
                - calculateComplexity(partnerReviews.get(cardId));
    }

    double calculateComplexity(ReviewLog review) {
        if (review == null || review.getReview() == null) {
            return 4 * 30;
        }

        double ratingFactor = 4.0 - review.getRating();
        long daysSinceReview = ChronoUnit.DAYS.between(review.getReview(), LocalDateTime.now());

        return ratingFactor * Math.max(daysSinceReview, 1);
    }

    @Transactional
    public Optional<StudySessionCardResponse> getCurrentCardBySourceId(String sourceId, LocalDateTime startOfDay) {
        return studySessionRepository.findWithCardsBySource_IdAndCreatedAtGreaterThanEqual(sourceId, startOfDay)
                .flatMap(this::findNextCard);
    }

    private Optional<StudySessionCardResponse> findNextCard(StudySession session) {
        final LocalDateTime now = LocalDateTime.now();
        final LocalDateTime lookaheadCutoff = now.plus(DUE_CARD_LOOKAHEAD);

        final List<StudySessionCard> eligibleCards = session.getCards().stream()
                .filter(c -> c.getCard().isReady())
                .filter(c -> !c.getCard().getDue().isAfter(lookaheadCutoff))
                .toList();

        final int maxPosition = eligibleCards.stream()
                .mapToInt(StudySessionCard::getPosition)
                .max()
                .orElse(0);

        final int newLastPosition = maxPosition + 1;

        final Optional<StudySessionCard> movedCard = eligibleCards.stream()
                .filter(c -> c.getCard().getLastReview() != null)
                .max(Comparator.comparing(c -> c.getCard().getLastReview()));

        movedCard.ifPresent(mostRecent -> mostRecent.setPosition(newLastPosition));

        final Integer movedCardId = movedCard.map(StudySessionCard::getId).orElse(null);

        final Optional<StudySessionCard> nextCard = eligibleCards.stream()
                .min(Comparator.comparingInt(c ->
                        c.getId().equals(movedCardId) ? newLastPosition : c.getPosition()));

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

    private Map<String, ReviewLog> findLatestReviewsByCardIds(
            List<String> cardIds,
            Specification<ReviewLog> partnerSpec) {
        final List<ReviewLog> reviews = reviewLogRepository.findAll(
                hasCardIdIn(cardIds).and(partnerSpec));

        return reviews.stream()
                .collect(Collectors.toMap(
                        r -> r.getCard().getId(),
                        Function.identity(),
                        (existing, replacement) -> existing));
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

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
import io.github.mucsi96.learnlanguage.model.StudySessionCardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;

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

    @Transactional
    public StudySessionResponse createSession(String sourceId) {
        studySessionRepository.deleteBySourceId(sourceId);
        studySessionRepository.deleteOlderThan(LocalDateTime.now().minusDays(1));

        Source source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found: " + sourceId));

        List<Card> dueCards = cardRepository.findDueCardsBySourceId(sourceId);
        Optional<LearningPartner> activePartner = learningPartnerService.getActivePartner();

        String sessionId = UUID.randomUUID().toString();
        String studyMode = activePartner.isPresent() ? "WITH_PARTNER" : "SOLO";
        StudySession session = StudySession.builder()
                .id(sessionId)
                .source(source)
                .createdAt(LocalDateTime.now())
                .studyMode(studyMode)
                .cards(new ArrayList<>())
                .build();

        List<StudySessionCard> sessionCards = activePartner
                .map(partner -> assignCardsSmartly(dueCards, session, partner))
                .orElseGet(() -> assignCardsSolo(dueCards, session));

        session.getCards().addAll(sessionCards);
        studySessionRepository.save(session);

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

        List<String> cardIds = cards.stream().map(Card::getId).toList();
        List<ReviewLog> latestReviews = reviewLogRepository.findLatestReviewsByCardIds(cardIds);

        Map<String, ReviewLog> userReviews = latestReviews.stream()
                .filter(r -> r.getLearningPartner() == null)
                .collect(Collectors.toMap(r -> r.getCard().getId(), Function.identity()));

        Map<String, ReviewLog> partnerReviews = latestReviews.stream()
                .filter(r -> r.getLearningPartner() != null
                        && r.getLearningPartner().getId().equals(partner.getId()))
                .collect(Collectors.toMap(r -> r.getCard().getId(), Function.identity()));

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
        if (review == null) {
            return 4 * 30;
        }

        double ratingFactor = 4.0 - review.getRating();
        long daysSinceReview = ChronoUnit.DAYS.between(review.getReview(), LocalDateTime.now());

        return ratingFactor * Math.max(daysSinceReview, 1);
    }

    @Transactional
    public Optional<StudySessionCardResponse> getCurrentCard(String sessionId) {
        return studySessionRepository.findByIdWithCards(sessionId)
                .flatMap(session -> {
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime lookaheadCutoff = now.plus(DUE_CARD_LOOKAHEAD);

                    List<StudySessionCard> eligibleCards = session.getCards().stream()
                            .filter(c -> c.getCard().isReady())
                            .filter(c -> !c.getCard().getDue().isAfter(lookaheadCutoff))
                            .collect(Collectors.toList());

                    int maxPosition = eligibleCards.stream()
                            .mapToInt(StudySessionCard::getPosition)
                            .max()
                            .orElse(0);

                    int newLastPosition = maxPosition + 1;
                    boolean positionUpdated = eligibleCards.stream()
                            .filter(c -> c.getCard().getLastReview() != null)
                            .max(Comparator.comparing(c -> c.getCard().getLastReview()))
                            .map(mostRecent -> {
                                mostRecent.setPosition(newLastPosition);
                                return true;
                            })
                            .orElse(false);

                    if (positionUpdated) {
                        studySessionRepository.save(session);
                    }

                    Optional<StudySessionCard> nextCard = eligibleCards.stream()
                            .min(Comparator.comparing(StudySessionCard::getPosition));

                    return nextCard.map(sessionCard -> {
                        String turnName = sessionCard.getLearningPartner() != null
                                ? sessionCard.getLearningPartner().getName()
                                : getCurrentUserFirstName();

                        return StudySessionCardResponse.builder()
                                .card(sessionCard.getCard())
                                .learningPartnerId(sessionCard.getLearningPartner() != null
                                        ? sessionCard.getLearningPartner().getId()
                                        : null)
                                .turnName(turnName)
                                .studyMode(session.getStudyMode())
                                .build();
                    });
                });
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

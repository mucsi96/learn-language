package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private static final int GOOD_RATING_THRESHOLD = 3;

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

        List<Card> orderedCards = activePartner.isPresent()
                ? orderCardsForSmartAssignment(dueCards, activePartner.get())
                : dueCards;

        for (int i = 0; i < orderedCards.size(); i++) {
            Card card = orderedCards.get(i);

            LearningPartner assignedPartner = null;
            if (activePartner.isPresent()) {
                assignedPartner = (i % 2 == 1) ? activePartner.get() : null;
            }

            StudySessionCard sessionCard = StudySessionCard.builder()
                    .session(session)
                    .card(card)
                    .position(i)
                    .learningPartner(assignedPartner)
                    .build();

            session.getCards().add(sessionCard);
        }

        studySessionRepository.save(session);

        return StudySessionResponse.builder()
                .sessionId(sessionId)
                .build();
    }

    List<Card> orderCardsForSmartAssignment(List<Card> cards, LearningPartner partner) {
        if (cards.isEmpty()) {
            return cards;
        }

        List<String> cardIds = cards.stream().map(Card::getId).collect(Collectors.toList());
        List<ReviewLog> lastReviews = reviewLogRepository.findLastReviewsByCardIds(cardIds);
        Map<String, ReviewLog> reviewByCardId = lastReviews.stream()
                .collect(Collectors.toMap(r -> r.getCard().getId(), r -> r));

        List<CardWithScore> scoredCards = cards.stream()
                .map(card -> new CardWithScore(card, calculatePartnerScore(card, reviewByCardId, partner)))
                .collect(Collectors.toList());

        scoredCards.sort(Comparator.comparingInt(CardWithScore::score).reversed());

        int totalCards = scoredCards.size();
        int partnerCount = totalCards / 2;
        int myselfCount = totalCards - partnerCount;

        List<Card> cardsForMyself = scoredCards.stream()
                .skip(partnerCount)
                .map(CardWithScore::card)
                .collect(Collectors.toList());

        List<Card> cardsForPartner = scoredCards.stream()
                .limit(partnerCount)
                .map(CardWithScore::card)
                .collect(Collectors.toList());

        List<Card> orderedCards = new ArrayList<>(totalCards);
        for (int i = 0; i < totalCards; i++) {
            if (i % 2 == 0) {
                int myselfIndex = i / 2;
                if (myselfIndex < myselfCount) {
                    orderedCards.add(cardsForMyself.get(myselfIndex));
                }
            } else {
                int partnerIndex = i / 2;
                if (partnerIndex < partnerCount) {
                    orderedCards.add(cardsForPartner.get(partnerIndex));
                }
            }
        }

        return orderedCards;
    }

    int calculatePartnerScore(Card card, Map<String, ReviewLog> reviewByCardId, LearningPartner partner) {
        ReviewLog lastReview = reviewByCardId.get(card.getId());
        if (lastReview == null) {
            return 0;
        }

        boolean reviewedByPartner = lastReview.getLearningPartner() != null
                && lastReview.getLearningPartner().getId().equals(partner.getId());
        boolean wasGoodRating = lastReview.getRating() >= GOOD_RATING_THRESHOLD;

        if (reviewedByPartner) {
            return wasGoodRating ? -1 : 1;
        } else {
            return wasGoodRating ? 1 : -1;
        }
    }

    private record CardWithScore(Card card, int score) {
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

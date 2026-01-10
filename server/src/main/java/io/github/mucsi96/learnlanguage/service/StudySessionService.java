package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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

        List<Card> orderedCards = activePartner
                .map(partner -> assignCardsSmartly(dueCards, partner))
                .orElse(dueCards);

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

    List<Card> assignCardsSmartly(List<Card> cards, LearningPartner partner) {
        if (cards.isEmpty()) {
            return cards;
        }

        List<String> cardIds = cards.stream().map(Card::getId).collect(Collectors.toList());
        List<ReviewLog> latestReviews = reviewLogRepository.findLatestReviewsByCardIds(cardIds);

        Map<String, ReviewLog> userReviews = new HashMap<>();
        Map<String, ReviewLog> partnerReviews = new HashMap<>();

        for (ReviewLog review : latestReviews) {
            String cardId = review.getCard().getId();
            if (review.getLearningPartner() == null) {
                userReviews.put(cardId, review);
            } else if (review.getLearningPartner().getId().equals(partner.getId())) {
                partnerReviews.put(cardId, review);
            }
        }

        List<CardWithPreference> cardsWithPreference = cards.stream()
                .map(card -> new CardWithPreference(
                        card,
                        calculatePreference(card.getId(), userReviews, partnerReviews)))
                .collect(Collectors.toList());

        int totalCards = cards.size();
        int userSlots = (totalCards + 1) / 2;
        int partnerSlots = totalCards / 2;

        List<CardWithPreference> preferUser = cardsWithPreference.stream()
                .filter(c -> c.preference > 0)
                .sorted(Comparator.comparingInt((CardWithPreference c) -> c.preference).reversed())
                .collect(Collectors.toList());

        List<CardWithPreference> preferPartner = cardsWithPreference.stream()
                .filter(c -> c.preference < 0)
                .sorted(Comparator.comparingInt(c -> c.preference))
                .collect(Collectors.toList());

        List<CardWithPreference> neutral = cardsWithPreference.stream()
                .filter(c -> c.preference == 0)
                .collect(Collectors.toList());

        List<Card> userCards = new ArrayList<>();
        List<Card> partnerCards = new ArrayList<>();

        for (CardWithPreference cwp : preferUser) {
            if (userCards.size() < userSlots) {
                userCards.add(cwp.card);
            } else {
                partnerCards.add(cwp.card);
            }
        }

        for (CardWithPreference cwp : neutral) {
            if (userCards.size() < userSlots) {
                userCards.add(cwp.card);
            } else {
                partnerCards.add(cwp.card);
            }
        }

        for (CardWithPreference cwp : preferPartner) {
            if (partnerCards.size() < partnerSlots) {
                partnerCards.add(cwp.card);
            } else {
                userCards.add(cwp.card);
            }
        }

        List<Card> result = new ArrayList<>();
        int ui = 0, pi = 0;
        for (int i = 0; i < totalCards; i++) {
            if (i % 2 == 0 && ui < userCards.size()) {
                result.add(userCards.get(ui++));
            } else if (i % 2 == 1 && pi < partnerCards.size()) {
                result.add(partnerCards.get(pi++));
            } else if (ui < userCards.size()) {
                result.add(userCards.get(ui++));
            } else if (pi < partnerCards.size()) {
                result.add(partnerCards.get(pi++));
            }
        }

        return result;
    }

    int calculatePreference(String cardId, Map<String, ReviewLog> userReviews,
            Map<String, ReviewLog> partnerReviews) {
        ReviewLog userReview = userReviews.get(cardId);
        ReviewLog partnerReview = partnerReviews.get(cardId);

        if (userReview == null && partnerReview == null) {
            return 0;
        }

        if (userReview == null) {
            return 1;
        }

        if (partnerReview == null) {
            return -1;
        }

        int userRating = userReview.getRating();
        int partnerRating = partnerReview.getRating();

        if (userRating < partnerRating) {
            return 1;
        } else if (partnerRating < userRating) {
            return -1;
        }

        if (userReview.getReview().isAfter(partnerReview.getReview())) {
            return -1;
        } else if (partnerReview.getReview().isAfter(userReview.getReview())) {
            return 1;
        }

        return 0;
    }

    private record CardWithPreference(Card card, int preference) {
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

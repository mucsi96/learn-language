package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.CardResponse;
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
    private static final int SESSION_CARD_LIMIT = 50;

    private final CardRepository cardRepository;
    private final SourceRepository sourceRepository;
    private final StudySessionRepository studySessionRepository;
    private final StudySessionCardRepository studySessionCardRepository;
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
                .map(partner -> assignCardsSmartly(dueCards, session, partner, SESSION_CARD_LIMIT, 0))
                .orElseGet(() -> assignCardsSolo(dueCards, session, SESSION_CARD_LIMIT, 0));

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

    private Map<String, Double> toComplexityMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).doubleValue()));
    }

    @Transactional
    public void moveCardToBack(String cardId, String sourceId, LocalDateTime startOfDay) {
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
                    final Set<String> existingCardIds = session.getCards().stream()
                            .map(sc -> sc.getCard().getId())
                            .collect(Collectors.toSet());

                    final List<Card> newCards = cards.stream()
                            .filter(c -> !existingCardIds.contains(c.getId()))
                            .toList();

                    if (newCards.isEmpty()) {
                        return;
                    }

                    final int remainingSlots = SESSION_CARD_LIMIT - session.getCards().size();
                    if (remainingSlots <= 0) {
                        return;
                    }

                    final int positionOffset = session.getCards().stream()
                            .mapToInt(StudySessionCard::getPosition)
                            .max()
                            .orElse(-1) + 1;

                    final Optional<LearningPartner> activePartner = "WITH_PARTNER".equals(session.getStudyMode())
                            ? learningPartnerService.getActivePartner()
                            : Optional.empty();

                    final List<StudySessionCard> newSessionCards = activePartner
                            .map(partner -> assignCardsSmartly(newCards, session, partner, remainingSlots,
                                    positionOffset))
                            .orElseGet(() -> assignCardsSolo(newCards, session, remainingSlots, positionOffset));

                    studySessionCardRepository.saveAll(newSessionCards);
                });
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

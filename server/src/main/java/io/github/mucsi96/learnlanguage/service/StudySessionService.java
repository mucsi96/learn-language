package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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
import io.github.mucsi96.learnlanguage.model.StudySessionCardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudySessionService {

    private final CardRepository cardRepository;
    private final SourceRepository sourceRepository;
    private final StudySessionRepository studySessionRepository;
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

        for (int i = 0; i < dueCards.size(); i++) {
            Card card = dueCards.get(i);

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

    public Optional<StudySessionCardResponse> getCurrentCard(String sessionId) {
        return studySessionRepository.findById(sessionId)
                .flatMap(session -> {
                    LocalDateTime now = LocalDateTime.now();
                    List<StudySessionCard> cards = session.getCards();
                    Optional<StudySessionCard> nextCard = cards.stream()
                            .filter(c -> !c.getCard().getDue().isAfter(now))
                            .min((c1, c2) -> {
                                int dateCompare = c1.getCard().getDue().compareTo(c2.getCard().getDue());
                                if (dateCompare != 0) {
                                    return dateCompare;
                                }
                                return c1.getPosition().compareTo(c2.getPosition());
                            });

                    return nextCard.map(sessionCard -> {
                        String presenterName = sessionCard.getLearningPartner() != null
                                ? sessionCard.getLearningPartner().getName()
                                : getCurrentUserFirstName();

                        return StudySessionCardResponse.builder()
                                .card(sessionCard.getCard())
                                .learningPartnerId(sessionCard.getLearningPartner() != null
                                        ? sessionCard.getLearningPartner().getId()
                                        : null)
                                .presenterName(presenterName)
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

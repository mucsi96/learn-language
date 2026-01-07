package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySessionCard;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.LearningPartnerResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionCardResponse;
import io.github.mucsi96.learnlanguage.model.StudySessionResponse;
import io.github.mucsi96.learnlanguage.model.StudySettingsResponse;
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
    private final StudySettingsService studySettingsService;
    private final LearningPartnerService learningPartnerService;

    @Transactional
    public StudySessionResponse createSession(String sourceId) {
        studySessionRepository.deleteBySourceId(sourceId);

        Source source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found: " + sourceId));

        List<Card> dueCards = cardRepository.findDueCardsBySourceId(sourceId);
        StudySettingsResponse settings = studySettingsService.getStudySettings();
        List<PresenterInfo> presenters = buildPresenterList(settings);

        String sessionId = UUID.randomUUID().toString();
        StudySession session = StudySession.builder()
                .id(sessionId)
                .source(source)
                .createdAt(LocalDateTime.now())
                .currentIndex(0)
                .cards(new ArrayList<>())
                .build();

        for (int i = 0; i < dueCards.size(); i++) {
            Card card = dueCards.get(i);
            PresenterInfo presenter = presenters.get(i % presenters.size());

            LearningPartner partner = null;
            if (presenter.partnerId() != null) {
                partner = learningPartnerService.getLearningPartnerById(presenter.partnerId());
            }

            StudySessionCard sessionCard = StudySessionCard.builder()
                    .session(session)
                    .card(card)
                    .position(i)
                    .learningPartner(partner)
                    .isCompleted(false)
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
                    List<StudySessionCard> cards = session.getCards();
                    Optional<StudySessionCard> nextCard = cards.stream()
                            .filter(c -> !c.getIsCompleted())
                            .findFirst();

                    return nextCard.map(sessionCard -> {
                        String presenterName = sessionCard.getLearningPartner() != null
                                ? sessionCard.getLearningPartner().getName()
                                : "Myself";

                        return StudySessionCardResponse.builder()
                                .card(sessionCard.getCard())
                                .learningPartnerId(sessionCard.getLearningPartner() != null
                                        ? sessionCard.getLearningPartner().getId()
                                        : null)
                                .presenterName(presenterName)
                                .build();
                    });
                });
    }

    @Transactional
    public void markCardCompleted(String sessionId, String cardId) {
        studySessionRepository.findById(sessionId)
                .ifPresent(session -> {
                    session.getCards().stream()
                            .filter(c -> c.getCard().getId().equals(cardId))
                            .findFirst()
                            .ifPresent(c -> c.setIsCompleted(true));

                    studySessionRepository.save(session);
                });
    }

    @Transactional
    public void deleteSession(String sessionId) {
        studySessionRepository.deleteById(sessionId);
    }

    private List<PresenterInfo> buildPresenterList(StudySettingsResponse settings) {
        List<PresenterInfo> presenters = new ArrayList<>();

        presenters.add(new PresenterInfo(null, "Myself"));

        if ("WITH_PARTNER".equals(settings.getStudyMode()) && settings.getEnabledPartners() != null) {
            for (LearningPartnerResponse partner : settings.getEnabledPartners()) {
                presenters.add(new PresenterInfo(partner.getId(), partner.getName()));
            }
        }

        return presenters;
    }

    private record PresenterInfo(Integer partnerId, String name) {}
}

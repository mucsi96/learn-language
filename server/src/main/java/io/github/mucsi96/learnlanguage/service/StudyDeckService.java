package io.github.mucsi96.learnlanguage.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.LearningPartnerResponse;
import io.github.mucsi96.learnlanguage.model.StudyDeckItemResponse;
import io.github.mucsi96.learnlanguage.model.StudyDeckResponse;
import io.github.mucsi96.learnlanguage.model.StudySettingsResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudyDeckService {

    private final CardRepository cardRepository;
    private final StudySettingsService studySettingsService;

    public StudyDeckResponse getStudyDeck(String sourceId) {
        List<Card> dueCards = cardRepository.findDueCardsBySourceId(sourceId);
        StudySettingsResponse settings = studySettingsService.getStudySettings();

        List<StudyDeckItemResponse> items = new ArrayList<>();
        List<PresenterInfo> presenters = buildPresenterList(settings);

        for (int i = 0; i < dueCards.size(); i++) {
            Card card = dueCards.get(i);
            PresenterInfo presenter = presenters.get(i % presenters.size());

            items.add(StudyDeckItemResponse.builder()
                    .cardId(card.getId())
                    .learningPartnerId(presenter.partnerId())
                    .presenterName(presenter.name())
                    .build());
        }

        return StudyDeckResponse.builder()
                .items(items)
                .build();
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

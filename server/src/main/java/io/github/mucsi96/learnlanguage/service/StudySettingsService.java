package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.StudySettings;
import io.github.mucsi96.learnlanguage.model.StudySettingsRequest;
import io.github.mucsi96.learnlanguage.model.StudySettingsResponse;
import io.github.mucsi96.learnlanguage.repository.StudySettingsRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudySettingsService {

    private static final Integer SETTINGS_ID = 1;

    private final StudySettingsRepository studySettingsRepository;
    private final LearningPartnerService learningPartnerService;

    public StudySettingsResponse getStudySettings() {
        StudySettings settings = studySettingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> {
                    StudySettings defaultSettings = StudySettings.builder()
                            .id(SETTINGS_ID)
                            .studyMode("SOLO")
                            .build();
                    return studySettingsRepository.save(defaultSettings);
                });

        return StudySettingsResponse.builder()
                .studyMode(settings.getStudyMode())
                .enabledPartners(learningPartnerService.getEnabledLearningPartners())
                .build();
    }

    public StudySettingsResponse updateStudySettings(StudySettingsRequest request) {
        StudySettings settings = studySettingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> StudySettings.builder().id(SETTINGS_ID).build());

        settings.setStudyMode(request.getStudyMode());
        studySettingsRepository.save(settings);

        return getStudySettings();
    }
}

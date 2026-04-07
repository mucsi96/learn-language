package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.AudioSetting;
import io.github.mucsi96.learnlanguage.repository.AudioSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AudioSettingService {

    private static final String FRONT_DISABLED_KEY = "front-disabled";

    private final AudioSettingRepository audioSettingRepository;

    public boolean isFrontAudioDisabled() {
        return audioSettingRepository.findById(FRONT_DISABLED_KEY)
                .map(AudioSetting::getValue)
                .map(value -> value != 0)
                .orElse(false);
    }

    @Transactional
    public void setFrontAudioDisabled(boolean disabled) {
        audioSettingRepository.save(
                AudioSetting.builder().key(FRONT_DISABLED_KEY).value(disabled ? 1 : 0).build()
        );
    }
}

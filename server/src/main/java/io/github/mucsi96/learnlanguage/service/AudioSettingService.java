package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.AudioSetting;
import io.github.mucsi96.learnlanguage.repository.AudioSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AudioSettingService {

    private static final String FRONT_ENABLED_KEY = "front-enabled";

    private final AudioSettingRepository audioSettingRepository;

    public boolean isFrontAudioEnabled() {
        return audioSettingRepository.findById(FRONT_ENABLED_KEY)
                .map(AudioSetting::getValue)
                .map(value -> value != 0)
                .orElse(false);
    }

    @Transactional
    public void setFrontAudioEnabled(boolean enabled) {
        audioSettingRepository.save(
                AudioSetting.builder().key(FRONT_ENABLED_KEY).value(enabled ? 1 : 0).build()
        );
    }
}

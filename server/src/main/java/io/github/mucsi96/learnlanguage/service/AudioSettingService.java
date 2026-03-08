package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.AudioSetting;
import io.github.mucsi96.learnlanguage.repository.AudioSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AudioSettingService {

    private final AudioSettingRepository audioSettingRepository;

    public boolean isFrontAudioEnabled() {
        return audioSettingRepository.findById("front-enabled")
                .map(AudioSetting::getValue)
                .map(value -> value != 0)
                .orElse(true);
    }

    @Transactional
    public void setFrontAudioEnabled(boolean enabled) {
        audioSettingRepository.save(
                AudioSetting.builder().key("front-enabled").value(enabled ? 1 : 0).build()
        );
    }
}

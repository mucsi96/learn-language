package io.github.mucsi96.learnlanguage.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.RateLimitSetting;
import io.github.mucsi96.learnlanguage.model.RateLimitSettingRequest;
import io.github.mucsi96.learnlanguage.repository.RateLimitSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RateLimitSettingService {

    private final RateLimitSettingRepository rateLimitSettingRepository;

    public int getImageRateLimitPerMinute() {
        return getRateLimit("image-per-minute");
    }

    public int getAudioRateLimitPerMinute() {
        return getRateLimit("audio-per-minute");
    }

    @Transactional
    public void updateRateLimitSettings(RateLimitSettingRequest request) {
        final String type = request.getType();
        Optional.ofNullable(request.getMaxPerMinute())
                .ifPresent(value -> updateRateLimit(type + "-per-minute", value));
    }

    private int getRateLimit(String key) {
        return rateLimitSettingRepository.findById(key)
                .map(RateLimitSetting::getValue)
                .orElseThrow();
    }

    private void updateRateLimit(String key, int value) {
        final RateLimitSetting setting = rateLimitSettingRepository.findById(key)
                .map(existing -> existing.toBuilder().value(value).build())
                .orElseThrow();
        rateLimitSettingRepository.save(setting);
    }
}

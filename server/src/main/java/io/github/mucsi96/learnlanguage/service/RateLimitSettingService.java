package io.github.mucsi96.learnlanguage.service;

import java.util.Map;
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

    private static final Map<String, Integer> DEFAULTS = Map.of(
            "image-per-minute", 6,
            "audio-per-minute", 0,
            "image-max-concurrent", 0,
            "audio-max-concurrent", 3,
            "image-daily-limit", 0,
            "audio-daily-limit", 0
    );

    private final RateLimitSettingRepository rateLimitSettingRepository;

    public int getImageRateLimitPerMinute() {
        return getRateLimit("image-per-minute");
    }

    public int getAudioRateLimitPerMinute() {
        return getRateLimit("audio-per-minute");
    }

    public int getImageMaxConcurrentRequests() {
        return getRateLimit("image-max-concurrent");
    }

    public int getAudioMaxConcurrentRequests() {
        return getRateLimit("audio-max-concurrent");
    }

    public int getImageDailyLimit() {
        return getRateLimit("image-daily-limit");
    }

    public int getAudioDailyLimit() {
        return getRateLimit("audio-daily-limit");
    }

    @Transactional
    public void updateRateLimitSettings(RateLimitSettingRequest request) {
        final String type = request.getType();
        Optional.ofNullable(request.getMaxPerMinute())
                .ifPresent(value -> upsertRateLimit(type + "-per-minute", value));
        Optional.ofNullable(request.getMaxConcurrent())
                .ifPresent(value -> upsertRateLimit(type + "-max-concurrent", value));
        Optional.ofNullable(request.getDailyLimit())
                .ifPresent(value -> upsertRateLimit(type + "-daily-limit", value));
    }

    private int getRateLimit(String key) {
        return rateLimitSettingRepository.findById(key)
                .map(RateLimitSetting::getValue)
                .orElse(DEFAULTS.getOrDefault(key, 0));
    }

    private void upsertRateLimit(String key, int value) {
        final RateLimitSetting setting = rateLimitSettingRepository.findById(key)
                .map(existing -> existing.toBuilder().value(value).build())
                .orElse(RateLimitSetting.builder().key(key).value(value).build());
        rateLimitSettingRepository.save(setting);
    }
}

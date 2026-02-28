package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.RateLimitSetting;
import io.github.mucsi96.learnlanguage.repository.RateLimitSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RateLimitSettingService {

    private static final String IMAGE_PER_MINUTE_KEY = "image-per-minute";
    private static final String AUDIO_PER_MINUTE_KEY = "audio-per-minute";
    private static final String IMAGE_MAX_CONCURRENT_KEY = "image-max-concurrent";
    private static final String AUDIO_MAX_CONCURRENT_KEY = "audio-max-concurrent";

    private final RateLimitSettingRepository rateLimitSettingRepository;

    public int getImageRateLimitPerMinute() {
        return getRateLimit(IMAGE_PER_MINUTE_KEY);
    }

    public int getAudioRateLimitPerMinute() {
        return getRateLimit(AUDIO_PER_MINUTE_KEY);
    }

    public int getImageMaxConcurrent() {
        return getRateLimit(IMAGE_MAX_CONCURRENT_KEY);
    }

    public int getAudioMaxConcurrent() {
        return getRateLimit(AUDIO_MAX_CONCURRENT_KEY);
    }

    @Transactional
    public int updateImageRateLimit(int value) {
        return updateRateLimit(IMAGE_PER_MINUTE_KEY, value);
    }

    @Transactional
    public int updateAudioRateLimit(int value) {
        return updateRateLimit(AUDIO_PER_MINUTE_KEY, value);
    }

    @Transactional
    public int updateImageMaxConcurrent(int value) {
        return updateRateLimit(IMAGE_MAX_CONCURRENT_KEY, value);
    }

    @Transactional
    public int updateAudioMaxConcurrent(int value) {
        return updateRateLimit(AUDIO_MAX_CONCURRENT_KEY, value);
    }

    private int getRateLimit(String key) {
        return rateLimitSettingRepository.findById(key)
                .map(RateLimitSetting::getValue)
                .orElseThrow();
    }

    private int updateRateLimit(String key, int value) {
        final RateLimitSetting setting = rateLimitSettingRepository.findById(key)
                .map(existing -> existing.toBuilder().value(value).build())
                .orElseThrow();
        return rateLimitSettingRepository.save(setting).getValue();
    }
}

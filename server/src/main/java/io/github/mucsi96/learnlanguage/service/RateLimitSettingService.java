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
    private static final int DEFAULT_IMAGE_RATE_LIMIT = 6;
    private static final int DEFAULT_AUDIO_RATE_LIMIT = 12;

    private final RateLimitSettingRepository rateLimitSettingRepository;

    public Integer getImageRateLimitPerMinute() {
        return rateLimitSettingRepository.findById(IMAGE_PER_MINUTE_KEY)
                .map(RateLimitSetting::getValue)
                .orElse(DEFAULT_IMAGE_RATE_LIMIT);
    }

    public Integer getAudioRateLimitPerMinute() {
        return rateLimitSettingRepository.findById(AUDIO_PER_MINUTE_KEY)
                .map(RateLimitSetting::getValue)
                .orElse(DEFAULT_AUDIO_RATE_LIMIT);
    }

    @Transactional
    public Integer updateImageRateLimit(int value) {
        final RateLimitSetting setting = rateLimitSettingRepository.findById(IMAGE_PER_MINUTE_KEY)
                .map(existing -> existing.toBuilder().value(value).build())
                .orElse(RateLimitSetting.builder().key(IMAGE_PER_MINUTE_KEY).value(value).build());
        return rateLimitSettingRepository.save(setting).getValue();
    }

    @Transactional
    public Integer updateAudioRateLimit(int value) {
        final RateLimitSetting setting = rateLimitSettingRepository.findById(AUDIO_PER_MINUTE_KEY)
                .map(existing -> existing.toBuilder().value(value).build())
                .orElse(RateLimitSetting.builder().key(AUDIO_PER_MINUTE_KEY).value(value).build());
        return rateLimitSettingRepository.save(setting).getValue();
    }
}

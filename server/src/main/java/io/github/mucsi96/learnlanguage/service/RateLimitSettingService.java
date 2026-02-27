package io.github.mucsi96.learnlanguage.service;

import org.springframework.beans.factory.annotation.Value;
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

    private final RateLimitSettingRepository rateLimitSettingRepository;

    @Value("${rate-limit.image-per-minute:#{null}}")
    private Integer defaultImageRateLimit;

    @Value("${rate-limit.audio-per-minute:#{null}}")
    private Integer defaultAudioRateLimit;

    public Integer getImageRateLimitPerMinute() {
        return rateLimitSettingRepository.findById(IMAGE_PER_MINUTE_KEY)
                .map(RateLimitSetting::getValue)
                .orElse(defaultImageRateLimit);
    }

    public Integer getAudioRateLimitPerMinute() {
        return rateLimitSettingRepository.findById(AUDIO_PER_MINUTE_KEY)
                .map(RateLimitSetting::getValue)
                .orElse(defaultAudioRateLimit);
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

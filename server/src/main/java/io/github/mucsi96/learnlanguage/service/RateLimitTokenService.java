package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class RateLimitTokenService {

    private final TokenPool imageTokenPool;
    private final TokenPool audioTokenPool;

    public RateLimitTokenService(RateLimitSettingService rateLimitSettingService) {
        this.imageTokenPool = new TokenPool(
                "image",
                rateLimitSettingService::getImageMaxConcurrent,
                rateLimitSettingService::getImageRateLimitPerMinute);
        this.audioTokenPool = new TokenPool(
                "audio",
                rateLimitSettingService::getAudioMaxConcurrent,
                rateLimitSettingService::getAudioRateLimitPerMinute);
    }

    public void acquireImageToken() throws InterruptedException {
        imageTokenPool.acquire();
    }

    public void releaseImageToken() {
        imageTokenPool.release();
    }

    public void acquireAudioToken() throws InterruptedException {
        audioTokenPool.acquire();
    }

    public void releaseAudioToken() {
        audioTokenPool.release();
    }
}

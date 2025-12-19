package io.github.mucsi96.learnlanguage.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.config.ModelPricingConfig;
import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.repository.ModelUsageLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModelUsageLoggingService {

    private final ModelUsageLogRepository repository;
    private final ModelPricingConfig pricingConfig;

    public void logChatUsage(
            String modelName,
            String operationType,
            long inputTokens,
            long outputTokens,
            long processingTimeMs,
            String responseContent) {

        BigDecimal cost = pricingConfig.calculateChatCost(modelName, inputTokens, outputTokens);

        ModelUsageLog usageLog = ModelUsageLog.builder()
                .modelName(modelName)
                .modelType(ModelType.CHAT)
                .operationType(operationType)
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .costUsd(cost)
                .processingTimeMs(processingTimeMs)
                .responseContent(responseContent)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(usageLog);

        log.info("Chat usage: model={}, operation={}, inputTokens={}, outputTokens={}, cost=${}, time={}ms",
                modelName, operationType, inputTokens, outputTokens, cost, processingTimeMs);
    }

    public void logImageUsage(
            String modelName,
            String operationType,
            int imageCount,
            long processingTimeMs) {

        BigDecimal cost = pricingConfig.calculateImageCost(modelName, imageCount);

        ModelUsageLog usageLog = ModelUsageLog.builder()
                .modelName(modelName)
                .modelType(ModelType.IMAGE)
                .operationType(operationType)
                .imageCount(imageCount)
                .costUsd(cost)
                .processingTimeMs(processingTimeMs)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(usageLog);

        log.info("Image usage: model={}, operation={}, images={}, cost=${}, time={}ms",
                modelName, operationType, imageCount, cost, processingTimeMs);
    }

    public void logAudioUsage(
            String modelName,
            String operationType,
            long characterCount,
            long processingTimeMs) {

        BigDecimal cost = pricingConfig.calculateAudioCost(modelName, characterCount);

        ModelUsageLog usageLog = ModelUsageLog.builder()
                .modelName(modelName)
                .modelType(ModelType.AUDIO)
                .operationType(operationType)
                .inputCharacters(characterCount)
                .costUsd(cost)
                .processingTimeMs(processingTimeMs)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(usageLog);

        log.info("Audio usage: model={}, operation={}, characters={}, cost=${}, time={}ms",
                modelName, operationType, characterCount, cost, processingTimeMs);
    }
}

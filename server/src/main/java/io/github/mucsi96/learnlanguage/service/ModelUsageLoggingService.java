package io.github.mucsi96.learnlanguage.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.config.ModelPricingConfig;
import io.github.mucsi96.learnlanguage.config.OperationIdContext;
import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.model.OperationType;
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
            OperationType operationType,
            long inputTokens,
            long outputTokens,
            long processingTimeMs,
            String responseContent) {

        BigDecimal cost = pricingConfig.calculateChatCost(modelName, inputTokens, outputTokens);

        ModelUsageLog usageLog = ModelUsageLog.builder()
                .modelName(modelName)
                .modelType(ModelType.CHAT)
                .operationType(operationType)
                .operationId(OperationIdContext.get())
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .costUsd(cost)
                .processingTimeMs(processingTimeMs)
                .responseContent(responseContent)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(usageLog);

        log.info("Chat usage: model={}, operation={}, operationId={}, inputTokens={}, outputTokens={}, cost=${}, time={}ms",
                modelName, operationType, OperationIdContext.get(), inputTokens, outputTokens, cost, processingTimeMs);
    }

    public void logImageUsage(
            String modelName,
            OperationType operationType,
            int imageCount,
            long processingTimeMs) {

        BigDecimal cost = pricingConfig.calculateImageCost(modelName, imageCount);

        ModelUsageLog usageLog = ModelUsageLog.builder()
                .modelName(modelName)
                .modelType(ModelType.IMAGE)
                .operationType(operationType)
                .operationId(OperationIdContext.get())
                .imageCount(imageCount)
                .costUsd(cost)
                .processingTimeMs(processingTimeMs)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(usageLog);

        log.info("Image usage: model={}, operation={}, operationId={}, images={}, cost=${}, time={}ms",
                modelName, operationType, OperationIdContext.get(), imageCount, cost, processingTimeMs);
    }

    public void logAudioUsage(
            String modelName,
            OperationType operationType,
            long characterCount,
            long processingTimeMs) {

        BigDecimal cost = pricingConfig.calculateAudioCost(modelName, characterCount);

        ModelUsageLog usageLog = ModelUsageLog.builder()
                .modelName(modelName)
                .modelType(ModelType.AUDIO)
                .operationType(operationType)
                .operationId(OperationIdContext.get())
                .inputCharacters(characterCount)
                .costUsd(cost)
                .processingTimeMs(processingTimeMs)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(usageLog);

        log.info("Audio usage: model={}, operation={}, operationId={}, characters={}, cost=${}, time={}ms",
                modelName, operationType, OperationIdContext.get(), characterCount, cost, processingTimeMs);
    }
}

package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.google.genai.errors.ApiException;

import io.github.mucsi96.learnlanguage.entity.QuotaLimitHit;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.repository.QuotaLimitHitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuotaLimitHitService {

    private final QuotaLimitHitRepository repository;

    public void logQuotaLimitHit(String serviceName, String modelName, OperationType operationType,
            ApiException exception) {
        final String quotaType = detectQuotaType(exception.message(), operationType);

        final QuotaLimitHit hit = QuotaLimitHit.builder()
                .serviceName(serviceName)
                .modelName(modelName)
                .operationType(operationType)
                .quotaType(quotaType)
                .errorCode(exception.code())
                .errorMessage(exception.message())
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(hit);

        log.warn("Quota limit hit: service={}, model={}, operation={}, quotaType={}, code={}, message={}",
                serviceName, modelName, operationType, quotaType, exception.code(), exception.message());
    }

    public void logQuotaLimitHit(String serviceName, String modelName, OperationType operationType,
            int errorCode, String errorMessage) {
        final String quotaType = detectQuotaType(errorMessage, operationType);

        final QuotaLimitHit hit = QuotaLimitHit.builder()
                .serviceName(serviceName)
                .modelName(modelName)
                .operationType(operationType)
                .quotaType(quotaType)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(hit);

        log.warn("Quota limit hit: service={}, model={}, operation={}, quotaType={}, code={}, message={}",
                serviceName, modelName, operationType, quotaType, errorCode, errorMessage);
    }

    private String detectQuotaType(String errorMessage, OperationType operationType) {
        if (errorMessage == null) {
            return inferFromOperationType(operationType);
        }

        final String lowerMessage = errorMessage.toLowerCase();

        if (lowerMessage.contains("requests per minute") || lowerMessage.contains("rpm")) {
            return "RPM";
        }
        if (lowerMessage.contains("tokens per minute") || lowerMessage.contains("tpm")) {
            return "TPM";
        }
        if (lowerMessage.contains("requests per day") || lowerMessage.contains("rpd")
                || lowerMessage.contains("daily")) {
            return "RPD";
        }
        if (lowerMessage.contains("images per minute") || lowerMessage.contains("ipm")) {
            return "IPM";
        }

        return inferFromOperationType(operationType);
    }

    private String inferFromOperationType(OperationType operationType) {
        return switch (operationType) {
            case IMAGE_GENERATION -> "IPM";
            default -> "RPM";
        };
    }
}

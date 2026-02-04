package io.github.mucsi96.learnlanguage.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ModelUsageLogResponse {

    private Long id;
    private String modelName;
    private ModelType modelType;
    private OperationType operationType;
    private Long inputTokens;
    private Long outputTokens;
    private Long inputCharacters;
    private Integer imageCount;
    private BigDecimal costUsd;
    private Long processingTimeMs;
    private String responseContent;
    private Integer rating;
    private LocalDateTime createdAt;

    public static ModelUsageLogResponse from(ModelUsageLog log) {
        return ModelUsageLogResponse.builder()
                .id(log.getId())
                .modelName(log.getModelName())
                .modelType(log.getModelType())
                .operationType(log.getOperationType())
                .inputTokens(log.getInputTokens())
                .outputTokens(log.getOutputTokens())
                .inputCharacters(log.getInputCharacters())
                .imageCount(log.getImageCount())
                .costUsd(log.getCostUsd())
                .processingTimeMs(log.getProcessingTimeMs())
                .responseContent(log.getResponseContent())
                .rating(log.getRating())
                .createdAt(log.getCreatedAt())
                .build();
    }
}

package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import io.github.mucsi96.learnlanguage.entity.QuotaLimitHit;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuotaLimitHitResponse {

    private Long id;
    private String serviceName;
    private String modelName;
    private OperationType operationType;
    private String quotaType;
    private Integer errorCode;
    private String errorMessage;
    private LocalDateTime createdAt;

    public static QuotaLimitHitResponse from(QuotaLimitHit hit) {
        return QuotaLimitHitResponse.builder()
                .id(hit.getId())
                .serviceName(hit.getServiceName())
                .modelName(hit.getModelName())
                .operationType(hit.getOperationType())
                .quotaType(hit.getQuotaType())
                .errorCode(hit.getErrorCode())
                .errorMessage(hit.getErrorMessage())
                .createdAt(hit.getCreatedAt())
                .build();
    }
}

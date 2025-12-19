package io.github.mucsi96.learnlanguage.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import io.github.mucsi96.learnlanguage.model.ModelType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "model_usage_logs", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Column(name = "model_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ModelType modelType;

    @Column(name = "operation_type", nullable = false)
    private String operationType;

    @Column(name = "input_tokens")
    private Long inputTokens;

    @Column(name = "output_tokens")
    private Long outputTokens;

    @Column(name = "input_characters")
    private Long inputCharacters;

    @Column(name = "image_count")
    private Integer imageCount;

    @Column(name = "cost_usd", precision = 10, scale = 6)
    private BigDecimal costUsd;

    @Column(name = "processing_time_ms")
    private Long processingTimeMs;

    @Column(name = "response_content", columnDefinition = "text")
    private String responseContent;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

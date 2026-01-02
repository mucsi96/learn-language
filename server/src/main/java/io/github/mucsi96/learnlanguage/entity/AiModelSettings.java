package io.github.mucsi96.learnlanguage.entity;

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
@Table(name = "ai_model_settings", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "operation_type", nullable = false, unique = true, length = 100)
    private String operationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_type", nullable = false, length = 50)
    private ModelType modelType;

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

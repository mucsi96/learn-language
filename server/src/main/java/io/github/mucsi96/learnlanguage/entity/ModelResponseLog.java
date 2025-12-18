package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.ModelResponse;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "model_response_logs", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelResponseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operation_type", nullable = false)
    private String operationType;

    @Column(nullable = false)
    private String input;

    @Column(nullable = false, columnDefinition = "jsonb")
    @Type(JsonBinaryType.class)
    private List<ModelResponse> responses;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

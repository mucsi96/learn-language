package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cards", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Card {

    @Id
    private String id;

    @ManyToOne
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @Column(name = "source_page_number", nullable = false)
    private Integer sourcePageNumber;

    @Column(nullable = false, columnDefinition = "jsonb")
    @Type(JsonBinaryType.class)
    private CardData data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CardReadiness readiness;

    private LocalDateTime due;

    private Float stability;

    private Float difficulty;

    @Column(name = "elapsed_days")
    private Float elapsedDays;

    @Column(name = "scheduled_days")
    private Float scheduledDays;

    @Column(name = "learning_steps")
    private Integer learningSteps;

    private Integer reps;

    private Integer lapses;

    private String state;

    @Column(name = "last_review")
    private LocalDateTime lastReview;

    public boolean isInReview() {
        return this.readiness == CardReadiness.IN_REVIEW;
    }

    public boolean isReady() {
        return this.readiness == CardReadiness.READY;
    }

    public boolean isReviewed() {
        return this.readiness == CardReadiness.REVIEWED;
    }
}

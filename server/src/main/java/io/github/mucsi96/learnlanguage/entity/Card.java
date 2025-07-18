package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(nullable = false)
    private String readiness;

    @Column(nullable = false)
    private String state;

    private Integer step;

    @Column(nullable = false)
    private Float stability;

    @Column(nullable = false)
    private Float difficulty;

    @Column(name = "elapsed_days", nullable = false)
    private Float elapsedDays;

    @Column(name = "scheduled_days", nullable = false)
    private Float scheduledDays;

    @Column(nullable = false)
    private Integer reps;

    @Column(nullable = false)
    private Integer lapses;

    @Column(nullable = false)
    private LocalDateTime due;

    @Column(name = "last_review")
    private LocalDateTime lastReview;
}

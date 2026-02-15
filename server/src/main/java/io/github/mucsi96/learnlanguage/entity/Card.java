package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.Formula;
import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
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
    private LocalDateTime due;

    @Column(nullable = false)
    private Float stability;

    @Column(nullable = false)
    private Float difficulty;

    @Column(name = "elapsed_days", nullable = false)
    private Float elapsedDays;

    @Column(name = "scheduled_days", nullable = false)
    private Float scheduledDays;

    @Column(name = "learning_steps", nullable = false)
    private Integer learningSteps;

    @Column(nullable = false)
    private Integer reps;

    @Column(nullable = false)
    private Integer lapses;

    @Column(nullable = false)
    private String state;

    @Column(name = "last_review")
    private LocalDateTime lastReview;

    @Formula("(" +
        "SELECT CASE " +
        "  WHEN stats.cnt = 0 THEN NULL " +
        "  WHEN stats.cnt = 1 THEN CASE WHEN stats.last_rating >= 3 THEN 100.0 ELSE 0.0 END " +
        "  ELSE (CASE WHEN stats.last_rating >= 3 THEN 50.0 ELSE 0.0 END + " +
        "        50.0 * (stats.success_count - CASE WHEN stats.last_rating >= 3 THEN 1 ELSE 0 END) / (stats.cnt - 1)) " +
        "END " +
        "FROM (" +
        "  SELECT " +
        "    COUNT(*) as cnt, " +
        "    COUNT(*) FILTER (WHERE r.rating >= 3) as success_count, " +
        "    (SELECT r2.rating FROM learn_language.review_logs r2 WHERE r2.card_id = id ORDER BY r2.review DESC LIMIT 1) as last_rating " +
        "  FROM learn_language.review_logs r " +
        "  WHERE r.card_id = id" +
        ") stats" +
        ")")
    private Float reviewScore;

    public boolean hasReadiness(String readiness) {
        if (readiness == null) {
            return false;
        }

        return readiness.equals(this.readiness);
    }

    public boolean isInReview() {
        return hasReadiness(CardReadiness.IN_REVIEW);
    }

    public boolean isReady() {
        return hasReadiness(CardReadiness.READY);
    }

    public boolean isReviewed() {
        return hasReadiness(CardReadiness.REVIEWED);
    }
}

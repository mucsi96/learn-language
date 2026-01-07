package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "review_logs", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @ManyToOne
    @JoinColumn(name = "learning_partner_id")
    private LearningPartner learningPartner;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private LocalDateTime due;

    @Column(nullable = false)
    private Double stability;

    @Column(nullable = false)
    private Double difficulty;

    @Column(nullable = false)
    private Double elapsedDays;

    private Double lastElapsedDays;

    @Column(nullable = false)
    private Double scheduledDays;

    private Integer learningSteps;

    @Column(nullable = false)
    private LocalDateTime review;

    private Integer reviewDuration;
}

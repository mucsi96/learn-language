package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Immutable
@Table(name = "card_view", schema = "learn_language")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CardView {

    @Id
    private String id;

    @Column(name = "source_id", nullable = false)
    private String sourceId;

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
    private Integer reps;

    @Column(nullable = false)
    private String state;

    @Column(name = "last_review")
    private LocalDateTime lastReview;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type")
    private CardType cardType;

    @Column(name = "last_review_rating")
    private Integer lastReviewRating;

    @Column(name = "last_review_learning_partner_name")
    private String lastReviewLearningPartnerName;

    @Column(name = "review_score")
    private Integer reviewScore;
}

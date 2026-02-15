package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
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

    @Column(name = "source_name")
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    private SourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "language_level")
    private LanguageLevel languageLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type")
    private CardType cardType;

    @Enumerated(EnumType.STRING)
    @Column(name = "format_type")
    private SourceFormatType formatType;

    @Column(name = "source_start_page")
    private Integer sourceStartPage;

    @Column(name = "source_bookmarked_page")
    private Integer sourceBookmarkedPage;

    @Column(name = "last_review_rating")
    private Integer lastReviewRating;

    @Column(name = "last_review_learning_partner_name")
    private String lastReviewLearningPartnerName;

    public boolean hasReadiness(String readiness) {
        if (readiness == null) {
            return false;
        }
        return readiness.equals(this.readiness);
    }

    public boolean isInReview() {
        return hasReadiness(CardReadiness.IN_REVIEW);
    }
}

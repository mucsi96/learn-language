package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rating rating;

    @Column(nullable = false)
    private LocalDateTime reviewDatetime;

    private Integer reviewDuration;
}

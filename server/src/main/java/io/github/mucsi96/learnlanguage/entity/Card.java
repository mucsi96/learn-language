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
    private State state;

    private Integer step;
    private Float stability;
    private Float difficulty;

    @Column(nullable = false)
    private LocalDateTime due;

    private LocalDateTime lastReview;
}

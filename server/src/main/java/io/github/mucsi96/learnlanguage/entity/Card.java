package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cards", schema = "learn_language")
@Data
@Builder
public class Card {

    @Id
    private String id;

    @ManyToOne
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @Column(nullable = false, columnDefinition = "jsonb")
    private String data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private State state;

    private Integer step;
    private Float stability;
    private Float difficulty;

    @Column(nullable = false)
    private LocalDateTime due;

    private LocalDateTime lastReview;
}

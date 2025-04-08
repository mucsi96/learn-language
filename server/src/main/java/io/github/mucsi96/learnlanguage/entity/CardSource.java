package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "card_sources", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardSource {

    @Id
    @ManyToOne
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @Id
    @ManyToOne
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @Column(nullable = false)
    private Integer pageNumber;
}

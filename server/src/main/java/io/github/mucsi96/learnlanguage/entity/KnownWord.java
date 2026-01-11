package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "known_words", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnownWord {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "german", nullable = false)
    private String german;

    @Column(name = "hungarian", nullable = false)
    private String hungarian;
}

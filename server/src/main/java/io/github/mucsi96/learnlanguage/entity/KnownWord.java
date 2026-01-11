package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "word_id", nullable = false, unique = true)
    private String wordId;

    @Column(name = "german_word", nullable = false)
    private String germanWord;

    @Column(name = "hungarian_translation", nullable = false)
    private String hungarianTranslation;
}

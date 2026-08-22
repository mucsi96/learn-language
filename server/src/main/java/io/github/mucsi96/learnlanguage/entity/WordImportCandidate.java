package io.github.mucsi96.learnlanguage.entity;

import java.time.Instant;
import java.util.List;

import org.hibernate.annotations.Type;

import io.github.mucsi96.learnlanguage.model.WordImportStatus;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
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
@Table(name = "word_import_candidates", schema = "learn_language")
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class WordImportCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @Column(nullable = false)
    private String lemma;

    @Column(name = "word_type")
    private String wordType;

    @Column
    private String article;

    @Column(name = "occurrence_count", nullable = false)
    private Integer occurrenceCount;

    @Column(nullable = false, columnDefinition = "jsonb")
    @Type(JsonBinaryType.class)
    private List<String> examples;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WordImportStatus status;

    @Column(name = "card_id")
    private String cardId;

    @Column(name = "known_word_created")
    private Boolean knownWordCreated;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

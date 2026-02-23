package io.github.mucsi96.learnlanguage.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "highlights", schema = "learn_language", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "source_id", "highlighted_word", "sentence" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Highlight {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @ManyToOne
  @JoinColumn(name = "source_id", nullable = false)
  private Source source;

  @Column(name = "highlighted_word", nullable = false)
  private String highlightedWord;

  @Column(nullable = false, columnDefinition = "text")
  private String sentence;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;
}

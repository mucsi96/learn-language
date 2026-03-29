package io.github.mucsi96.learnlanguage.entity;

import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import jakarta.annotation.Nonnull;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sources", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Source {

  @Id
  private String id;

  @Nonnull
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "source_type")
  private SourceType sourceType;

  @Nonnull
  private Integer startPage;

  private Integer bookmarkedPage;

  @Column(name = "bookmarked_document_id")
  private Integer bookmarkedDocumentId;

  @Enumerated(EnumType.STRING)
  @Column(name = "language_level")
  private LanguageLevel languageLevel;

  @Enumerated(EnumType.STRING)
  @Column(name = "card_type")
  private CardType cardType;

  @Enumerated(EnumType.STRING)
  @Column(name = "format_type")
  private SourceFormatType formatType;

  @Builder.Default
  @Column(name = "card_limit", nullable = false)
  private Integer cardLimit = 50;

  @Builder.Default
  @Column(name = "new_card_limit", nullable = false)
  private Integer newCardLimit = 50;
}

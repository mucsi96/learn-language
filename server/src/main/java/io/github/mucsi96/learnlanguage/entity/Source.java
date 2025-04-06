package io.github.mucsi96.learnlanguage.entity;

import jakarta.annotation.Nonnull;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sources", schema = "learn_language")
@Data
@Builder
public class Source {

    @Id
    private String id;

    @Nonnull
    private String name;

    @Nonnull
    private Integer startPage;

    private Integer bookmarkedPage;
}

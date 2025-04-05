package io.github.mucsi96.learnlanguage.entity;

import jakarta.annotation.Nonnull;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "sources", schema = "learn_language")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Source {

    @Id
    private String id;

    @Nonnull
    private String name;

    @Nonnull
    private Integer startPage;

    private Integer bookmarkedPage;
}

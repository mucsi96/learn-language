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
@Table(name = "source_groups", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceGroup {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String name;
}

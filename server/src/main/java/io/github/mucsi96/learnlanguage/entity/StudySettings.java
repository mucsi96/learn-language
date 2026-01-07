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
@Table(name = "study_settings", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySettings {

    @Id
    private Integer id;

    @Column(name = "study_mode", nullable = false)
    @Builder.Default
    private String studyMode = "SOLO";
}

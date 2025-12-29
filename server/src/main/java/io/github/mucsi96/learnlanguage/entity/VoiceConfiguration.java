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
@Table(name = "voice_configurations", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "voice_id", nullable = false)
    private String voiceId;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false, length = 10)
    private String language;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private Boolean isEnabled = true;
}

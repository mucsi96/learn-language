package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "image_settings", schema = "learn_language")
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ImageSetting {

    @Id
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "use_english_for_image_generation", nullable = false)
    private Boolean useEnglishForImageGeneration;
}

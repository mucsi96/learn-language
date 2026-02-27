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
@Table(name = "rate_limit_settings", schema = "learn_language")
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class RateLimitSetting {

    @Id
    @Column(name = "key", nullable = false)
    private String key;

    @Column(name = "value", nullable = false)
    private Integer value;
}

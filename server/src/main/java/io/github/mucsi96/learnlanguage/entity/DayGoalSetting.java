package io.github.mucsi96.learnlanguage.entity;

import io.github.mucsi96.learnlanguage.model.DayGoalTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "day_goal_settings", schema = "learn_language")
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class DayGoalSetting {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false)
    private DayGoalTier tier;

    @Column(name = "required_completion_percent", nullable = false)
    private Integer requiredCompletionPercent;

    @Column(name = "required_accuracy_percent", nullable = false)
    private Integer requiredAccuracyPercent;
}

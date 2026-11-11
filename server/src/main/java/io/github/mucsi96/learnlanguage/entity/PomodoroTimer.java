package io.github.mucsi96.learnlanguage.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pomodoro_timers", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PomodoroTimer {
    @Id
    private String userId;
    private Long endsAt;
    private Long remainingMs;
    private long version;
}

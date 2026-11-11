package io.github.mucsi96.learnlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import io.github.mucsi96.learnlanguage.entity.PomodoroTimer;

public interface PomodoroTimerRepository extends JpaRepository<PomodoroTimer, String> {
    @Modifying
    @Query(value = """
        INSERT INTO learn_language.pomodoro_timers (user_id, ends_at, remaining_ms, version)
        SELECT :userId, :endsAt, :remainingMs, 1 WHERE :version = 0
        ON CONFLICT (user_id) DO NOTHING
        """, nativeQuery = true)
    int insertState(String userId, Long endsAt, Long remainingMs, long version);

    @Modifying
    @Query(value = """
        UPDATE learn_language.pomodoro_timers
        SET ends_at = :endsAt, remaining_ms = :remainingMs, version = version + 1
        WHERE user_id = :userId AND version = :version
        """, nativeQuery = true)
    int updateState(String userId, Long endsAt, Long remainingMs, long version);
}

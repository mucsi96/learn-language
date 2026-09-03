package io.github.mucsi96.learnlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.DayGoalSetting;
import io.github.mucsi96.learnlanguage.model.DayGoalTier;

@Repository
public interface DayGoalSettingRepository extends JpaRepository<DayGoalSetting, DayGoalTier> {
}

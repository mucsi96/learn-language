package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.StudySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudySettingsRepository extends JpaRepository<StudySettings, Integer> {
}

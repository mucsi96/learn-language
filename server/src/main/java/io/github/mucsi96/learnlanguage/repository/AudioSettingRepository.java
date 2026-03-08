package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.AudioSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AudioSettingRepository extends JpaRepository<AudioSetting, String> {
}

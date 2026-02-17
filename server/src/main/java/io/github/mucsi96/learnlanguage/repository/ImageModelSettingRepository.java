package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ImageModelSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ImageModelSettingRepository extends JpaRepository<ImageModelSetting, Integer> {
    Optional<ImageModelSetting> findByModelName(String modelName);
}

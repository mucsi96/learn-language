package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.VoiceConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoiceConfigurationRepository extends JpaRepository<VoiceConfiguration, Integer> {
    List<VoiceConfiguration> findByIsEnabledTrue();
    List<VoiceConfiguration> findByLanguageAndIsEnabledTrue(String language);
}

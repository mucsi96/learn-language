package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import io.github.mucsi96.learnlanguage.entity.ExtractionRegion;
import io.github.mucsi96.learnlanguage.entity.Source;

public interface ExtractionRegionRepository extends JpaRepository<ExtractionRegion, Integer> {
    List<ExtractionRegion> findBySourceAndPageNumber(Source source, Integer pageNumber);
}

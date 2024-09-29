package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ImportsRepository extends JpaRepository<Import, Long> {
    @Query("SELECT DISTINCT import.category FROM imports import")
    List<String> findDistinctCategory();

    List<Import> findByCategoryOrderByIdAsc(String category, Pageable pageable);
    List<Import> findByCategoryAndIdGreaterThanOrderByIdAsc(String category, Long id, Pageable pageable);

}
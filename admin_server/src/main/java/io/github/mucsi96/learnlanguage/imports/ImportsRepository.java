package io.github.mucsi96.learnlanguage.imports;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportsRepository extends JpaRepository<Import, Long> {
    Page<Import> findAll(Pageable pageable);
}

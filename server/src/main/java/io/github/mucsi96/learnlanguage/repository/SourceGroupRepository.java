package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.SourceGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SourceGroupRepository extends JpaRepository<SourceGroup, Integer> {
}

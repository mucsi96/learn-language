package io.github.mucsi96.learnlanguage.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import io.github.mucsi96.learnlanguage.entity.SourceContent;

public interface SourceContentRepository extends Repository<SourceContent, UUID> {
    java.util.Optional<SourceContent> findById(UUID id);

    @Query(value = """
            SELECT * FROM learn_language.content_items WHERE extension_id = :extensionId
            ORDER BY (descriptor->>'number')::int ASC NULLS LAST, descriptor->>'title'
            """, nativeQuery = true)
    List<SourceContent> findCatalogue(String extensionId);
}

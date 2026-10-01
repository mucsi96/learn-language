package io.github.mucsi96.learnlanguage.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import io.github.mucsi96.learnlanguage.entity.ExtensionDiscovery;
import io.github.mucsi96.learnlanguage.entity.SourceContent;
import io.github.mucsi96.learnlanguage.repository.ExtensionDiscoveryRepository;
import io.github.mucsi96.learnlanguage.repository.SourceContentRepository;
import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ContentStore {
    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final ExtensionDiscoveryRepository discoveries;
    private final SourceContentRepository content;

    public boolean discovered(String extensionId) {
        return discoveries.existsById(extensionId);
    }

    @Transactional
    public void discovered(String extensionId, List<ContentDescriptor> descriptors) {
        descriptors.forEach(descriptor -> jdbc.sql("""
                INSERT INTO learn_language.content_items(id, extension_id, external_id, descriptor)
                VALUES (:id, :extension, :external, CAST(:descriptor AS jsonb))
                ON CONFLICT(extension_id, external_id) DO UPDATE SET descriptor = CASE
                  WHEN content_items.preparation IS NULL THEN excluded.descriptor ELSE content_items.descriptor END
                """)
                .param("id", UUID.randomUUID()).param("extension", extensionId).param("external", descriptor.externalId())
                .param("descriptor", json.writeValueAsString(descriptor)).update());
        discoveries.save(ExtensionDiscovery.builder().extensionId(extensionId)
                .refreshedAt(java.time.Instant.now()).build());
    }

    @Transactional(readOnly = true)
    public List<ContentItem> list(String extensionId) {
        return content.findCatalogue(extensionId).stream().map(SourceContent::toContentItem).toList();
    }

    @Transactional(readOnly = true)
    public ContentItem require(UUID id) {
        return content.findById(id).map(SourceContent::toContentItem)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Content not found"));
    }

    public void enqueue(UUID id) {
        jdbc.sql("UPDATE learn_language.content_items SET status = 'queued', error = NULL WHERE id = :id AND status IN ('unprepared', 'failed')")
                .param("id", id).update();
    }

    public Optional<ContentItem> claim() {
        return jdbc.sql("""
                UPDATE learn_language.content_items SET status = 'processing', lease_token = :token,
                  lease_until = now() + interval '15 minutes'
                WHERE id = (SELECT id FROM learn_language.content_items
                  WHERE status = 'queued' OR (status = 'processing' AND lease_until < now())
                  ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
                RETURNING *
                """).param("token", UUID.randomUUID()).query(this::item).optional();
    }

    public void checkpoint(ContentItem item, Preparation preparation, String status) {
        final int updated = jdbc.sql("""
                UPDATE learn_language.content_items SET preparation = CAST(:preparation AS jsonb), status = :status,
                  lease_until = now() + interval '15 minutes'
                WHERE id = :id AND lease_token = :token
                """).param("preparation", json.writeValueAsString(preparation)).param("status", status)
                .param("id", item.id()).param("token", item.leaseToken()).update();
        if (updated != 1) throw new IllegalStateException("Preparation lease was lost");
    }

    public void failed(ContentItem item, String error) {
        jdbc.sql("UPDATE learn_language.content_items SET status = 'failed', error = :error WHERE id = :id AND lease_token = :token")
                .param("error", error).param("id", item.id()).param("token", item.leaseToken()).update();
    }

    private ContentItem item(ResultSet row, int index) throws SQLException {
        final String preparation = row.getString("preparation");
        return new ContentItem(row.getObject("id", UUID.class), row.getString("extension_id"),
                json.readValue(row.getString("descriptor"), ContentDescriptor.class),
                preparation == null ? null : json.readValue(preparation, Preparation.class),
                row.getString("status"), row.getString("error"), row.getObject("lease_token", UUID.class));
    }
}

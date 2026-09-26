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
import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ContentStore {
    private final JdbcClient jdbc;
    private final JsonMapper json;

    public boolean discoveryFresh(String extensionId, java.time.Duration interval) {
        return jdbc.sql("SELECT count(*) FROM learn_language.extension_discovery WHERE extension_id = :id AND refreshed_at > :since")
                .param("id", extensionId).param("since", java.sql.Timestamp.from(java.time.Instant.now().minus(interval)))
                .query(Integer.class).single() > 0;
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
        jdbc.sql("INSERT INTO learn_language.extension_discovery VALUES (:id, now()) ON CONFLICT(extension_id) DO UPDATE SET refreshed_at = now()")
                .param("id", extensionId).update();
    }

    public List<ContentItem> list(String extensionId) {
        return jdbc.sql("SELECT * FROM learn_language.content_items WHERE extension_id = :id ORDER BY (descriptor->>'number')::int ASC NULLS LAST, descriptor->>'title'")
                .param("id", extensionId).query(this::item).list();
    }

    public ContentItem require(UUID id) {
        return jdbc.sql("SELECT * FROM learn_language.content_items WHERE id = :id").param("id", id)
                .query(this::item).optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Content not found"));
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

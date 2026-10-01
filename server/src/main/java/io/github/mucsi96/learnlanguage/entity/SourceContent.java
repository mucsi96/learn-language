package io.github.mucsi96.learnlanguage.entity;

import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Type;
import io.github.mucsi96.learnlanguage.model.ContentModels.ContentDescriptor;
import io.github.mucsi96.learnlanguage.model.ContentModels.ContentItem;
import io.github.mucsi96.learnlanguage.model.ContentModels.Preparation;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Immutable
@Table(name = "content_items", schema = "learn_language")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceContent {
    @Id
    private UUID id;
    private String extensionId;
    private String externalId;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private ContentDescriptor descriptor;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Preparation preparation;

    private String status;
    private String error;
    private UUID leaseToken;
    private Instant leaseUntil;

    public ContentItem toContentItem() {
        return new ContentItem(id, extensionId, descriptor, preparation, status, error, leaseToken);
    }
}

package io.github.mucsi96.learnlanguage.entity;

import java.time.Instant;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "collection_discovery", schema = "learn_language")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionDiscovery {
    @Id
    private String collectionPath;
    private Instant refreshedAt;
}

package io.github.mucsi96.learnlanguage.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "pending_photos",
    schema = "learn_language",
    uniqueConstraints = @UniqueConstraint(
        name = "pending_photos_user_source_unique",
        columnNames = {"user_id", "source_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingPhoto {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private String userId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "source_id", nullable = false)
  private Source source;

  @Column(name = "image_data", nullable = false, columnDefinition = "bytea")
  private byte[] imageData;

  @Column(name = "content_type", nullable = false)
  private String contentType;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;
}

package io.github.mucsi96.learnlanguage.service;

import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ContentListeningService {
    private final JdbcClient jdbc;
    private final SourceContentService content;
    private final ContentCoverageService coverage;
    private final ContentAssetService assets;

    public Map<UUID, Progress> progress(String sourceId, String userId) {
        return jdbc.sql("SELECT content_id, position, duration, completed FROM learn_language.listening_progress WHERE source_id = :source AND user_id = :user")
                .param("source", sourceId).param("user", userId)
                .query((row, index) -> Map.entry(row.getObject("content_id", UUID.class),
                        new Progress(row.getDouble("position"), row.getDouble("duration"), row.getBoolean("completed"))))
                .list().stream().collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public Playback start(String sourceId, UUID contentId, String userId) {
        final var item = eligible(sourceId, contentId);
        final String videoId = item.descriptor().youtubeVideoId();
        final String revision = videoId == null ? assets.revision(assets.cached(item.descriptor().audioUrl())) : "youtube:" + videoId;
        final UUID session = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO learn_language.listening_progress(source_id, content_id, user_id, audio_revision, session_id, expires_at)
                VALUES (:source, :content, :user, :revision, :session, now() + interval '4 hours')
                ON CONFLICT(source_id, content_id, user_id) DO UPDATE SET
                  session_id = excluded.session_id, sequence = 0, expires_at = excluded.expires_at,
                  position = CASE WHEN listening_progress.audio_revision = excluded.audio_revision THEN listening_progress.position ELSE 0 END,
                  duration = CASE WHEN listening_progress.audio_revision = excluded.audio_revision THEN listening_progress.duration ELSE 0 END,
                  completed = CASE WHEN listening_progress.audio_revision = excluded.audio_revision THEN listening_progress.completed ELSE false END,
                  audio_revision = excluded.audio_revision
                """).param("source", sourceId).param("content", contentId).param("user", userId)
                .param("revision", revision).param("session", session).update();
        return new Playback(session, videoId == null ? "audio" : "youtube",
                videoId == null ? "/api/source/" + sourceId + "/content/" + contentId + "/media" : null, videoId, revision,
                progress(sourceId, userId).get(contentId));
    }

    public Path media(String sourceId, UUID contentId, UUID sessionId) {
        final int sessions = jdbc.sql("""
                SELECT count(*) FROM learn_language.listening_progress WHERE source_id = :source AND content_id = :content
                AND session_id = :session AND expires_at > now()
                """).param("source", sourceId).param("content", contentId).param("session", sessionId)
                .query(Integer.class).single();
        if (sessions == 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Playback session expired");
        final var item = eligible(sourceId, contentId);
        if (item.descriptor().audioUrl() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No downloadable audio asset");
        return assets.cached(item.descriptor().audioUrl());
    }

    public void save(String sourceId, UUID contentId, String userId, ProgressRequest request) {
        eligible(sourceId, contentId);
        if (!Double.isFinite(request.position()) || !Double.isFinite(request.duration()) || request.position() < 0
                || request.duration() <= 0 || request.position() > request.duration() + 1 || request.sequence() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid listening position");
        }
        final int updated = jdbc.sql("""
                UPDATE learn_language.listening_progress SET position = :position, duration = :duration,
                  completed = :completed, sequence = :sequence, updated_at = now(), expires_at = now() + interval '4 hours'
                WHERE source_id = :source AND content_id = :content AND user_id = :user AND session_id = :session
                  AND sequence < :sequence AND expires_at > now()
                """).param("position", request.position()).param("duration", request.duration()).param("completed", request.completed())
                .param("sequence", request.sequence()).param("source", sourceId).param("content", contentId)
                .param("user", userId).param("session", request.sessionId()).update();
        if (updated == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Playback session or progress was superseded");
    }

    private ContentItem eligible(String sourceId, UUID contentId) {
        final var item = content.require(sourceId, contentId);
        if ((item.descriptor().audioUrl() == null && item.descriptor().youtubeVideoId() == null)
                || !coverage.unlocked(coverage.coverage(item, coverage.cards(sourceId)))) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Every word needs a ready card reviewed at least once");
        }
        return item;
    }
}

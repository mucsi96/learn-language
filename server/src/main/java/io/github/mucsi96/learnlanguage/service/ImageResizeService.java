package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@Service
public class ImageResizeService {
    private static final int TIMEOUT_SECONDS = 30;

    public byte[] resizeImage(byte[] imageData, int width, int height) throws IOException {
        final ProcessBuilder pb = new ProcessBuilder(
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", "pipe:0",
            "-vf", "scale=%d:%d:force_original_aspect_ratio=decrease".formatted(width, height),
            "-c:v", "libwebp", "-quality", "75",
            "-frames:v", "1",
            "-f", "webp",
            "pipe:1"
        );
        final Process process = pb.start();
        boolean success = false;

        try {
            final byte[][] stderr = {null};
            final Thread stderrReader = Thread.ofVirtual().start(() -> {
                try {
                    stderr[0] = process.getErrorStream().readAllBytes();
                } catch (IOException e) {
                    throw new RuntimeException("Failed to read ffmpeg stderr", e);
                }
            });

            final Thread writer = Thread.ofVirtual().start(() -> {
                try (final var os = process.getOutputStream()) {
                    os.write(imageData);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });

            final byte[] result = process.getInputStream().readAllBytes();
            writer.join();
            stderrReader.join();

            final boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                throw new IOException("ffmpeg timed out after %d seconds".formatted(TIMEOUT_SECONDS));
            }

            final int exitCode = process.exitValue();
            if (exitCode != 0) {
                throw new IOException("ffmpeg exited with code %d: %s".formatted(
                    exitCode, new String(stderr[0], StandardCharsets.UTF_8)));
            }

            success = true;
            return result;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("ffmpeg process interrupted", e);
        } finally {
            if (!success) {
                process.destroyForcibly();
            }
        }
    }
}

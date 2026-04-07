package io.github.mucsi96.learnlanguage.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class ImageResizeService {
    public byte[] resizeImage(byte[] imageData, int width, int height, String id) throws IOException {
        final ProcessBuilder pb = new ProcessBuilder(
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", "pipe:0",
            "-vf", "scale=%d:%d:force_original_aspect_ratio=decrease".formatted(width, height),
            "-c:v", "libwebp", "-quality", "75",
            "-frames:v", "1",
            "-f", "webp",
            "pipe:1"
        );
        pb.redirectErrorStream(false);
        final Process process = pb.start();

        final Thread writer = Thread.ofVirtual().start(() -> {
            try (final var os = process.getOutputStream()) {
                os.write(imageData);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });

        final byte[] result = process.getInputStream().readAllBytes();
        final int exitCode;
        try {
            writer.join();
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("ffmpeg process interrupted", e);
        }

        if (exitCode != 0) {
            final String error = new String(process.getErrorStream().readAllBytes());
            throw new IOException("ffmpeg exited with code %d: %s".formatted(exitCode, error));
        }

        return result;
    }
}

package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class ImageResizeService {
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

        final byte[][] stderr = {new byte[0]};
        final Thread stderrReader = Thread.ofVirtual().start(() -> {
            try {
                stderr[0] = process.getErrorStream().readAllBytes();
            } catch (IOException ignored) {}
        });

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
            stderrReader.join();
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("ffmpeg process interrupted", e);
        }

        if (exitCode != 0) {
            throw new IOException("ffmpeg exited with code %d: %s".formatted(
                exitCode, new String(stderr[0], StandardCharsets.UTF_8)));
        }

        return result;
    }
}

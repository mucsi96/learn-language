package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FfmpegService {
    private static final int TIMEOUT_SECONDS = 30;

    public byte[] resizeImage(byte[] imageData, int width, int height) throws IOException {
        final String inputFormat = detectImageFormat(imageData);
        return run(imageData,
                "ffmpeg", "-y", "-loglevel", "error",
                "-f", inputFormat, "-i", "pipe:0",
                "-filter:v", "scale=%d:%d:force_original_aspect_ratio=decrease".formatted(width, height),
                "-codec:v", "libwebp", "-quality", "75",
                "-frames:v", "1",
                "-f", "webp",
                "pipe:1");
    }

    public byte[] trimSilence(byte[] audioData) throws IOException {
        return run(audioData,
                "ffmpeg", "-y", "-loglevel", "error",
                "-f", "s16le", "-ar", "44100", "-ac", "1",
                "-i", "pipe:0",
                "-filter:a",
                "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
                "-codec:a", "libmp3lame", "-b:a", "128k",
                "-f", "mp3",
                "pipe:1");
    }

    private byte[] run(byte[] input, String... args) throws IOException {
        log.info("Running ffmpeg command: {}", String.join(" ", args));
        log.info("Input size: {} bytes", input.length);

        final ProcessBuilder pb = new ProcessBuilder(List.of(args));
        final Process process = pb.start();
        boolean success = false;

        try {
            final byte[][] stderr = { null };
            final Thread stderrReader = Thread.ofVirtual().start(() -> {
                try {
                    stderr[0] = process.getErrorStream().readAllBytes();
                } catch (IOException e) {
                    throw new RuntimeException("Failed to read ffmpeg stderr", e);
                }
            });

            final Thread writer = Thread.ofVirtual().start(() -> {
                try (final var os = process.getOutputStream()) {
                    os.write(input);
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
            final String stderrOutput = new String(stderr[0], StandardCharsets.UTF_8);

            if (exitCode != 0) {
                log.error("ffmpeg exit code: {}, output size: {} bytes", exitCode, result.length);
                if (!stderrOutput.isBlank()) {
                    log.error("ffmpeg stderr: {}", stderrOutput);
                }
                throw new IOException("ffmpeg exited with code %d: %s".formatted(exitCode, stderrOutput));
            }

            if (!stderrOutput.isBlank()) {
                log.info("ffmpeg stderr: {}", stderrOutput);
            }

            log.info("ffmpeg exit code: {}, output size: {} bytes", exitCode, result.length);

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

    private static String detectImageFormat(byte[] data) {
        if (data.length >= 4
                && data[0] == (byte) 0x89
                && data[1] == (byte) 'P'
                && data[2] == (byte) 'N'
                && data[3] == (byte) 'G') {
            return "png_pipe";
        }
        if (data.length >= 3
                && data[0] == (byte) 0xFF
                && data[1] == (byte) 0xD8
                && data[2] == (byte) 0xFF) {
            return "jpeg_pipe";
        }
        if (data.length >= 12
                && data[0] == (byte) 'R'
                && data[1] == (byte) 'I'
                && data[2] == (byte) 'F'
                && data[3] == (byte) 'F'
                && data[8] == (byte) 'W'
                && data[9] == (byte) 'E'
                && data[10] == (byte) 'B'
                && data[11] == (byte) 'P') {
            return "webp_pipe";
        }
        throw new IllegalArgumentException(
                "Unsupported image format: unable to detect from magic bytes (first byte: 0x%02X, size: %d)"
                        .formatted(data.length > 0 ? data[0] & 0xFF : 0, data.length));
    }
}

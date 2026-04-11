package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FfmpegService {

    private static final int TIMEOUT_SECONDS = 30;
    private static final String INPUT = "__INPUT__";

    public void resizeImage(byte[] imageData, int width, int height, Path outputFile) throws IOException {
        final String inputFormat = detectImageFormat(imageData);
        Files.createDirectories(outputFile.getParent());
        run(imageData,
                "ffmpeg", "-y", "-loglevel", "error",
                "-f", inputFormat, "-i", INPUT,
                "-filter:v", "scale=%d:%d:force_original_aspect_ratio=decrease".formatted(width, height),
                "-codec:v", "libwebp", "-quality", "75",
                "-frames:v", "1",
                "-f", "webp",
                outputFile.toString());
    }

    public void trimSilence(byte[] audioData, Path outputFile) throws IOException {
        Files.createDirectories(outputFile.getParent());
        run(audioData,
                "ffmpeg", "-y", "-loglevel", "error",
                "-f", "s16le", "-ar", "44100", "-ac", "1",
                "-i", INPUT,
                "-filter:a",
                "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
                "-codec:a", "libmp3lame", "-b:a", "128k",
                "-f", "mp3",
                outputFile.toString());
    }

    private void run(byte[] input, String... args) throws IOException {
        final Path inputFile = Files.createTempFile("ffmpeg-in-", ".tmp");
        try {
            Files.write(inputFile, input);
            final ProcessBuilder pb = new ProcessBuilder(
                    Arrays.stream(args)
                            .map(a -> a.equals(INPUT) ? inputFile.toString() : a)
                            .toList());
            pb.redirectErrorStream(true);
            log.debug("Running ffmpeg: {}", String.join(" ", pb.command()));
            final Process process = pb.start();

            try {
                final byte[] output = process.getInputStream().readAllBytes();
                final boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);

                if (!finished) {
                    process.destroyForcibly();
                    throw new IOException("ffmpeg timed out after %d seconds".formatted(TIMEOUT_SECONDS));
                }

                if (process.exitValue() != 0) {
                    throw new IOException("ffmpeg exited with code %d: %s".formatted(
                            process.exitValue(), new String(output, StandardCharsets.UTF_8)));
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("ffmpeg process interrupted", e);
            } finally {
                process.destroyForcibly();
            }
        } finally {
            Files.deleteIfExists(inputFile);
        }
    }

    private static String detectImageFormat(byte[] data) {
        if (data.length >= 4
                && data[0] == (byte) 0x89
                && data[1] == (byte) 'P'
                && data[2] == (byte) 'N'
                && data[3] == (byte) 'G') {
            return "png";
        }
        if (data.length >= 3
                && data[0] == (byte) 0xFF
                && data[1] == (byte) 0xD8
                && data[2] == (byte) 0xFF) {
            return "jpeg";
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
            return "webp";
        }
        throw new IllegalArgumentException(
                "Unsupported image format: unable to detect from magic bytes (first byte: 0x%02X, size: %d)"
                        .formatted(data.length > 0 ? data[0] & 0xFF : 0, data.length));
    }
}

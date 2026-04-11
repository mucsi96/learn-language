package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

import org.springframework.stereotype.Service;

@Service
public class FfmpegService {

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

    private static final String INPUT = "__INPUT__";

    private void run(byte[] input, String... args) throws IOException {
        final Path inputFile = Files.createTempFile("ffmpeg-in-", ".tmp");
        try {
            Files.write(inputFile, input);
            final ProcessBuilder pb = new ProcessBuilder(
                    Arrays.stream(args)
                            .map(a -> a.equals(INPUT) ? inputFile.toString() : a)
                            .toList());
            pb.redirectErrorStream(true);
            final Process process = pb.start();
            final byte[] output = process.getInputStream().readAllBytes();

            try {
                process.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("ffmpeg process interrupted", e);
            }

            if (process.exitValue() != 0) {
                throw new IOException("ffmpeg exited with code %d: %s".formatted(
                        process.exitValue(), new String(output, StandardCharsets.UTF_8)));
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

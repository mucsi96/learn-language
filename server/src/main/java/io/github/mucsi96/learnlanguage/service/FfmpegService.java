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

    public byte[] process(List<String> args, byte[] input) throws IOException {
        log.info("Running ffmpeg command: {}", String.join(" ", args));
        log.info("Input size: {} bytes", input.length);

        final ProcessBuilder pb = new ProcessBuilder(args);
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
}

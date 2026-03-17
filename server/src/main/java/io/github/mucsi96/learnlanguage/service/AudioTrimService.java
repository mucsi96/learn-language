package io.github.mucsi96.learnlanguage.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AudioTrimService {

  public void trimSilence(Path filePath) {
    try {
      final long originalSize = Files.size(filePath);
      final Path tempOutput = filePath.resolveSibling(filePath.getFileName() + ".trimmed.mp3");

      try {
        final Process process = new ProcessBuilder(
            "ffmpeg", "-y",
            "-i", filePath.toString(),
            "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
            tempOutput.toString()
        ).redirectErrorStream(true).start();

        final int exitCode = process.waitFor();

        if (exitCode != 0) {
          final String output = new String(process.getInputStream().readAllBytes());
          log.warn("ffmpeg exited with code {}: {}", exitCode, output);
          return;
        }

        Files.move(tempOutput, filePath, StandardCopyOption.REPLACE_EXISTING);
        final long trimmedSize = Files.size(filePath);
        log.info("Trimmed audio silence: {} -> {} bytes ({})", originalSize, trimmedSize, filePath);
      } finally {
        Files.deleteIfExists(tempOutput);
      }
    } catch (Exception e) {
      log.warn("Failed to trim silence from {}", filePath, e);
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
    }
  }
}

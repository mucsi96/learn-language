package io.github.mucsi96.learnlanguage.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioTrimService {

  private final FileStorageService fileStorageService;

  public void trimSilence(String fileKey) {
    try {
      final Path filePath = fileStorageService.resolveFilePath(fileKey);
      final long originalSize = Files.size(filePath);
      final Path tempOutput = filePath.resolveSibling(filePath.getFileName() + ".trimmed.mp3");

      try {
        final Process process = new ProcessBuilder(
            "ffmpeg", "-y",
            "-i", filePath.toString(),
            "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
            tempOutput.toString()
        ).redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD).start();

        final int exitCode = process.waitFor();

        if (exitCode != 0) {
          return;
        }

        Files.move(tempOutput, filePath, StandardCopyOption.REPLACE_EXISTING);
        final long trimmedSize = Files.size(filePath);
        log.info("Trimmed audio silence: {} -> {} bytes ({})", originalSize, trimmedSize, fileKey);
      } finally {
        Files.deleteIfExists(tempOutput);
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("Interrupted while trimming silence from {}", fileKey, e);
    } catch (Exception e) {
      log.warn("Failed to trim silence from {}", fileKey, e);
    }
  }
}

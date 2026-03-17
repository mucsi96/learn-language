package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AudioTrimService {

  public byte[] trimSilence(byte[] mp3Bytes) {
    try {
      final Path inputFile = Files.createTempFile("audio-trim-in-", ".mp3");
      final Path outputFile = Files.createTempFile("audio-trim-out-", ".mp3");

      try {
        Files.write(inputFile, mp3Bytes);

        final Process process = new ProcessBuilder(
            "ffmpeg", "-y",
            "-i", inputFile.toString(),
            "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
            outputFile.toString()
        ).redirectErrorStream(true).start();

        final int exitCode = process.waitFor();

        if (exitCode != 0) {
          final String output = new String(process.getInputStream().readAllBytes());
          log.warn("ffmpeg exited with code {}: {}", exitCode, output);
          return mp3Bytes;
        }

        final byte[] trimmed = Files.readAllBytes(outputFile);
        log.info("Trimmed audio silence: {} -> {} bytes", mp3Bytes.length, trimmed.length);
        return trimmed;
      } finally {
        Files.deleteIfExists(inputFile);
        Files.deleteIfExists(outputFile);
      }
    } catch (IOException | InterruptedException e) {
      log.warn("Failed to trim silence from audio, returning original", e);
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      return mp3Bytes;
    }
  }
}

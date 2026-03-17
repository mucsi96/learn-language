package io.github.mucsi96.learnlanguage;

import io.github.mucsi96.learnlanguage.service.AudioTrimService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class AudioTrimTool {

  public static void main(String[] args) throws IOException {
    if (args.length < 1) {
      System.out.println("Usage: AudioTrimTool <input.mp3> [output.mp3]");
      System.out.println("  If output is omitted, overwrites the input file.");
      System.exit(1);
    }

    final Path inputPath = Paths.get(args[0]);
    final Path outputPath = args.length >= 2 ? Paths.get(args[1]) : inputPath;

    if (!Files.exists(inputPath)) {
      System.err.println("File not found: " + inputPath);
      System.exit(1);
    }

    final byte[] original = Files.readAllBytes(inputPath);
    System.out.printf("Input: %s (%d bytes)%n", inputPath, original.length);

    final AudioTrimService trimService = new AudioTrimService();
    final byte[] trimmed = trimService.trimSilence(original);

    if (trimmed.length < original.length) {
      final int savedBytes = original.length - trimmed.length;
      final double savedPercent = (savedBytes * 100.0) / original.length;
      System.out.printf("Trimmed: %d -> %d bytes (saved %d bytes, %.1f%%)%n",
          original.length, trimmed.length, savedBytes, savedPercent);
    } else {
      System.out.println("No silence detected, file unchanged.");
    }

    Files.write(outputPath, trimmed);
    System.out.printf("Output: %s%n", outputPath);
  }
}

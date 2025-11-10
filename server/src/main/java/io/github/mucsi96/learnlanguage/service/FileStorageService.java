package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;

import jakarta.annotation.PostConstruct;

@Service
public class FileStorageService {

  @Value("${storage.directory}")
  private String storageDirectory;

  private Path storagePath;

  @PostConstruct
  public void init() throws IOException {
    storagePath = Paths.get(storageDirectory).toAbsolutePath().normalize();
    Files.createDirectories(storagePath);
  }

  private Path resolveFilePath(String fileName) throws IOException {
    Path filePath = storagePath.resolve(fileName).normalize();

    // Security check: ensure the resolved path is within the storage directory
    if (!filePath.startsWith(storagePath)) {
      throw new IOException("Invalid file path: " + fileName);
    }

    return filePath;
  }

  public BinaryData fetchFile(String filePath) {
    try {
      Path resolvedPath = resolveFilePath(filePath);

      if (!Files.exists(resolvedPath)) {
        throw new RuntimeException("File not found: " + filePath);
      }

      byte[] fileContent = Files.readAllBytes(resolvedPath);
      return BinaryData.fromBytes(fileContent);
    } catch (IOException e) {
      throw new RuntimeException("Failed to fetch file: " + filePath, e);
    }
  }

  public void saveFile(BinaryData data, String filePath) {
    try {
      Path resolvedPath = resolveFilePath(filePath);

      // Create parent directories if they don't exist
      Path parentDir = resolvedPath.getParent();
      if (parentDir != null && !Files.exists(parentDir)) {
        Files.createDirectories(parentDir);
      }

      // Write the file
      Files.write(resolvedPath, data.toBytes(),
          StandardOpenOption.CREATE,
          StandardOpenOption.TRUNCATE_EXISTING);
    } catch (IOException e) {
      throw new RuntimeException("Failed to save file: " + filePath, e);
    }
  }

  public void deleteFile(String filePath) {
    try {
      Path resolvedPath = resolveFilePath(filePath);
      Files.deleteIfExists(resolvedPath);
    } catch (IOException e) {
      throw new RuntimeException("Failed to delete file: " + filePath, e);
    }
  }
}

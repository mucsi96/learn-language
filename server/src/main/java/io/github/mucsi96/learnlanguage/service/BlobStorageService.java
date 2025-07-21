package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.options.BlobParallelUploadOptions;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BlobStorageService {

  private final BlobServiceClient blobServiceClient;

  @Value("${blobstorage.containerName}")
  private String containerName;

  private BlobClient getBlobClient(String blobName) {
    return blobServiceClient.getBlobContainerClient(containerName).getBlobClient(blobName);
  }

  public BinaryData fetchBlob(String blobName) {
    return getBlobClient(blobName).downloadContent();
  }

  public void uploadBlob(BinaryData data, String blobName) {
    var mimeType = MediaTypeFactory.getMediaType(blobName);

    BlobHttpHeaders httpHeaders = new BlobHttpHeaders();
    mimeType.ifPresent(mime -> httpHeaders.setContentType(mime.toString()));

    BlobParallelUploadOptions options = new BlobParallelUploadOptions(data);
    options.setHeaders(httpHeaders);

    getBlobClient(blobName).uploadWithResponse(options, Duration.ofSeconds(5), null);
  }

  public void deleteBlob(String blobName) {
    getBlobClient(blobName).deleteIfExists();
  }
}

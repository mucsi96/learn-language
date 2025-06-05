package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.OffsetDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaTypeFactory;
import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.UserDelegationKey;
import com.azure.storage.blob.options.BlobParallelUploadOptions;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;

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

  public boolean blobExists(String blobName) {
    return getBlobClient(blobName).exists();
  }

  @Value("${blobstorage.accountUrl}")
  private String accountUrl;

  @Value("${blobstorage.publicUrl:#{null}}")
  private String publicUrl;

  public String getDownloadUrl(String blobName) {
    BlobClient blobClient = getBlobClient(blobName);
    UserDelegationKey userDelegationKey = blobServiceClient.getUserDelegationKey(
        OffsetDateTime.now().minusMinutes(1), OffsetDateTime.now().plusMinutes(2));

    BlobServiceSasSignatureValues sasValues = new BlobServiceSasSignatureValues(
        OffsetDateTime.now().plusMinutes(2),
        new BlobSasPermission().setReadPermission(true)).setStartTime(OffsetDateTime.now().minusMinutes(1));

    String sasToken = blobClient.generateUserDelegationSas(sasValues, userDelegationKey);
    String url = blobClient.getBlobUrl().replace("%2F", "/") + "?" + sasToken;

    if (publicUrl != null && !publicUrl.isEmpty()) {
      url = url.replaceFirst(accountUrl, publicUrl);
    }

    return url;
  }
}

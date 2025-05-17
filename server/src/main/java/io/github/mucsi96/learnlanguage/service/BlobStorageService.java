package io.github.mucsi96.learnlanguage.service;

import java.time.OffsetDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.models.UserDelegationKey;
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
        getBlobClient(blobName).upload(data, true);
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
                OffsetDateTime.now(), OffsetDateTime.now().plusMinutes(2));

        BlobServiceSasSignatureValues sasValues = new BlobServiceSasSignatureValues(
                OffsetDateTime.now().plusMinutes(2),
                new BlobSasPermission().setReadPermission(true)).setStartTime(OffsetDateTime.now());

        String sasToken = blobClient.generateUserDelegationSas(sasValues, userDelegationKey);
        String url = blobClient.getBlobUrl() + "?" + sasToken;

        if (publicUrl != null && !publicUrl.isEmpty()) {
            url = url.replaceFirst(accountUrl, publicUrl);
        }

        return url;
    }
}

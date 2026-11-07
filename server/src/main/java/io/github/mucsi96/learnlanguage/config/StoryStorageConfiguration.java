package io.github.mucsi96.learnlanguage.config;

import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobContainerClientBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration(proxyBeanMethods = false)
public class StoryStorageConfiguration {
    @Bean
    @Profile("!test")
    BlobContainerClient storyContainer() {
        return new BlobContainerClientBuilder().endpoint("https://ibari.blob.core.windows.net")
                .containerName("learn-language").credential(new DefaultAzureCredentialBuilder().build()).buildClient();
    }

    @Bean
    @Profile("test")
    BlobContainerClient testStoryContainer() {
        return new BlobContainerClientBuilder().endpoint("http://localhost:3070/content-fixtures")
                .containerName("learn-language").buildClient();
    }
}

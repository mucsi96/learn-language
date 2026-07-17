package io.github.mucsi96.learnlanguage.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class CacheConfiguration {

  public static final String LEMMATIZATION_CACHE = "lemmatization";

  @Bean
  CacheManager cacheManager() {
    final CaffeineCacheManager cacheManager = new CaffeineCacheManager(LEMMATIZATION_CACHE);
    cacheManager.setCaffeine(Caffeine.newBuilder().maximumSize(10000));
    return cacheManager;
  }
}

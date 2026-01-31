package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class SentenceIdService {

    public String generateSentenceId(String germanSentence) {
        if (germanSentence == null || germanSentence.isBlank()) {
            throw new IllegalArgumentException("German sentence cannot be null or blank");
        }

        final String normalized = germanSentence.trim().toLowerCase();
        return shortHash(normalized);
    }

    private String shortHash(String input) {
        try {
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            final byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return IntStream.range(0, Math.min(8, hash.length))
                    .mapToObj(i -> String.format("%02x", hash[i]))
                    .collect(Collectors.joining());
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}

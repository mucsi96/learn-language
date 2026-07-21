package io.github.mucsi96.learnlanguage.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.SneakyThrows;

@Service
public class TokenEncryptionService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int KEY_LENGTH_BYTES = 32;
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public TokenEncryptionService(@Value("${token-encryption-key}") String encodedKey) {
        this.secretKey = new SecretKeySpec(decodeKey(encodedKey), ALGORITHM);
    }

    private byte[] decodeKey(String encodedKey) {
        if (encodedKey == null || encodedKey.isBlank()) {
            throw new IllegalStateException("token-encryption-key is missing");
        }

        final byte[] keyBytes = decodeBase64(encodedKey.trim());

        if (keyBytes.length != KEY_LENGTH_BYTES) {
            throw new IllegalStateException(
                    "token-encryption-key must decode to %d bytes for AES-256 but was %d"
                            .formatted(KEY_LENGTH_BYTES, keyBytes.length));
        }

        return keyBytes;
    }

    private byte[] decodeBase64(String value) {
        try {
            return Base64.getDecoder().decode(value);
        } catch (final IllegalArgumentException e) {
            throw new IllegalStateException("token-encryption-key must be Base64 encoded", e);
        }
    }

    @SneakyThrows
    public String encrypt(String plaintext) {
        final byte[] iv = new byte[IV_LENGTH_BYTES];
        secureRandom.nextBytes(iv);

        final Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
        final byte[] cipherTextWithTag = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        final byte[] payload = ByteBuffer.allocate(iv.length + cipherTextWithTag.length)
                .put(iv)
                .put(cipherTextWithTag)
                .array();

        return Base64.getEncoder().encodeToString(payload);
    }

    @SneakyThrows
    public String decrypt(String encrypted) {
        final ByteBuffer buffer = ByteBuffer.wrap(Base64.getDecoder().decode(encrypted));

        final byte[] iv = new byte[IV_LENGTH_BYTES];
        buffer.get(iv);
        final byte[] cipherTextWithTag = new byte[buffer.remaining()];
        buffer.get(cipherTextWithTag);

        final Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
        return new String(cipher.doFinal(cipherTextWithTag), StandardCharsets.UTF_8);
    }
}

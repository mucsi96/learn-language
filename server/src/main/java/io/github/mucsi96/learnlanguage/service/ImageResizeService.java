package io.github.mucsi96.learnlanguage.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import net.coobird.thumbnailator.Thumbnails;

@Service
@RequiredArgsConstructor
public class ImageResizeService {
    public byte[] resizeImage(byte[] imageData, int width, int height, String id) throws IOException {
        ByteArrayInputStream bais = new ByteArrayInputStream(imageData);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Thumbnails.of(bais)
            .size(width, height)
            .outputFormat("webp")
            .outputQuality(0.75f)
            .keepAspectRatio(true)
            .toOutputStream(baos);
        return baos.toByteArray();
    }
}

package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImageResizeService {

    private final FfmpegService ffmpegService;

    public byte[] resizeImage(byte[] imageData, int width, int height) throws IOException {
        final String inputFormat = detectImageFormat(imageData);
        return ffmpegService.process(List.of(
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", inputFormat, "-i", "pipe:0",
            "-vf", "scale=%d:%d:force_original_aspect_ratio=decrease".formatted(width, height),
            "-c:v", "libwebp", "-quality", "75",
            "-frames:v", "1",
            "-f", "webp",
            "pipe:1"
        ), imageData);
    }

    private static String detectImageFormat(byte[] data) {
        if (data.length >= 4
                && data[0] == (byte) 0x89
                && data[1] == (byte) 'P'
                && data[2] == (byte) 'N'
                && data[3] == (byte) 'G') {
            return "png_pipe";
        }
        if (data.length >= 3
                && data[0] == (byte) 0xFF
                && data[1] == (byte) 0xD8
                && data[2] == (byte) 0xFF) {
            return "jpeg_pipe";
        }
        if (data.length >= 12
                && data[0] == (byte) 'R'
                && data[1] == (byte) 'I'
                && data[2] == (byte) 'F'
                && data[3] == (byte) 'F'
                && data[8] == (byte) 'W'
                && data[9] == (byte) 'E'
                && data[10] == (byte) 'B'
                && data[11] == (byte) 'P') {
            return "webp_pipe";
        }
        throw new IllegalArgumentException(
                "Unsupported image format: unable to detect from magic bytes (first byte: 0x%02X, size: %d)"
                        .formatted(data.length > 0 ? data[0] & 0xFF : 0, data.length));
    }
}

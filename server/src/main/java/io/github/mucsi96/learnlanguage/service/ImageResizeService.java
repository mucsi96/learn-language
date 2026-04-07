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
        return ffmpegService.process(List.of(
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", "pipe:0",
            "-vf", "scale=%d:%d:force_original_aspect_ratio=decrease".formatted(width, height),
            "-c:v", "libwebp", "-quality", "75",
            "-frames:v", "1",
            "-f", "webp",
            "pipe:1"
        ), imageData);
    }
}

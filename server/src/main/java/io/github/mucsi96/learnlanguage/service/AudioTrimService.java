package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AudioTrimService {

  private final FfmpegService ffmpegService;

  public byte[] trimSilence(byte[] audioData) throws IOException {
    return ffmpegService.process(List.of(
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", "pipe:0",
        "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
        "-f", "mp3",
        "pipe:1"
    ), audioData);
  }
}

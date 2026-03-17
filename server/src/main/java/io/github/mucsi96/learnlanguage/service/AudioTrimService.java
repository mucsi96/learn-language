package io.github.mucsi96.learnlanguage.service;

import javazoom.jl.decoder.Bitstream;
import javazoom.jl.decoder.Decoder;
import javazoom.jl.decoder.Header;
import javazoom.jl.decoder.SampleBuffer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;

@Service
@Slf4j
public class AudioTrimService {

  private static final int SILENCE_THRESHOLD = 500;

  private static final int[] BITRATES_V1_L3 = {
      0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0
  };

  private static final int[] BITRATES_V2_L3 = {
      0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0
  };

  private static final int[] SAMPLE_RATES_V1 = {44100, 48000, 32000};
  private static final int[] SAMPLE_RATES_V2 = {22050, 24000, 16000};
  private static final int[] SAMPLE_RATES_V25 = {11025, 12000, 8000};

  public byte[] trimSilence(byte[] mp3Bytes) {
    try {
      final List<int[]> frameBoundaries = scanFrameBoundaries(mp3Bytes);

      if (frameBoundaries.isEmpty()) {
        return mp3Bytes;
      }

      final List<Boolean> silentFrames = detectSilentFrames(mp3Bytes);
      final int frameCount = Math.min(frameBoundaries.size(), silentFrames.size());

      final int firstNonSilent = IntStream.range(0, frameCount)
          .filter(i -> !silentFrames.get(i))
          .findFirst()
          .orElse(-1);

      if (firstNonSilent == -1) {
        return mp3Bytes;
      }

      final int lastNonSilent = IntStream.iterate(frameCount - 1, i -> i >= 0, i -> i - 1)
          .filter(i -> !silentFrames.get(i))
          .findFirst()
          .orElse(-1);

      if (firstNonSilent == 0 && lastNonSilent == frameCount - 1) {
        return mp3Bytes;
      }

      final int startByte = frameBoundaries.get(firstNonSilent)[0];
      final int[] lastFrame = frameBoundaries.get(lastNonSilent);
      final int endByte = lastFrame[0] + lastFrame[1];

      log.info("Trimmed audio silence: {}ms from start, {}ms from end",
          firstNonSilent * 26,
          (frameCount - 1 - lastNonSilent) * 26);

      return Arrays.copyOfRange(mp3Bytes, startByte, endByte);

    } catch (Exception e) {
      log.warn("Failed to trim silence from audio, returning original", e);
      return mp3Bytes;
    }
  }

  private List<int[]> scanFrameBoundaries(byte[] data) {
    final List<int[]> frames = new ArrayList<>();
    int offset = skipId3v2Tag(data);

    while (offset < data.length - 4) {
      if ((data[offset] & 0xFF) == 0xFF && (data[offset + 1] & 0xE0) == 0xE0) {
        final int frameSize = parseFrameSize(data, offset);
        if (frameSize > 0 && offset + frameSize <= data.length) {
          final boolean atEnd = offset + frameSize >= data.length - 4;
          final boolean nextFrameValid = !atEnd
              && (data[offset + frameSize] & 0xFF) == 0xFF
              && (data[offset + frameSize + 1] & 0xE0) == 0xE0;

          if (atEnd || nextFrameValid) {
            frames.add(new int[]{offset, frameSize});
            offset += frameSize;
            continue;
          }
        }
      }
      offset++;
    }
    return frames;
  }

  private int parseFrameSize(byte[] data, int offset) {
    final int b1 = data[offset + 1] & 0xFF;
    final int b2 = data[offset + 2] & 0xFF;

    final int versionBits = (b1 >> 3) & 0x03;
    final int layerBits = (b1 >> 1) & 0x03;
    final int bitrateIndex = (b2 >> 4) & 0x0F;
    final int sampleRateIndex = (b2 >> 2) & 0x03;
    final int padding = (b2 >> 1) & 0x01;

    if (layerBits != 1 || sampleRateIndex == 3 || bitrateIndex == 0 || bitrateIndex == 15) {
      return -1;
    }

    final int bitrate;
    final int sampleRate;
    final int samplesPerFrame;

    switch (versionBits) {
      case 3:
        bitrate = BITRATES_V1_L3[bitrateIndex] * 1000;
        sampleRate = SAMPLE_RATES_V1[sampleRateIndex];
        samplesPerFrame = 1152;
        break;
      case 2:
        bitrate = BITRATES_V2_L3[bitrateIndex] * 1000;
        sampleRate = SAMPLE_RATES_V2[sampleRateIndex];
        samplesPerFrame = 576;
        break;
      case 0:
        bitrate = BITRATES_V2_L3[bitrateIndex] * 1000;
        sampleRate = SAMPLE_RATES_V25[sampleRateIndex];
        samplesPerFrame = 576;
        break;
      default:
        return -1;
    }

    if (bitrate == 0 || sampleRate == 0) {
      return -1;
    }

    return (samplesPerFrame / 8) * bitrate / sampleRate + padding;
  }

  private int skipId3v2Tag(byte[] data) {
    if (data.length >= 10 && data[0] == 'I' && data[1] == 'D' && data[2] == '3') {
      final int size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14)
          | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F);
      return size + 10;
    }
    return 0;
  }

  private List<Boolean> detectSilentFrames(byte[] mp3Bytes) throws Exception {
    final List<Boolean> silentFrames = new ArrayList<>();
    final Bitstream bitstream = new Bitstream(new ByteArrayInputStream(mp3Bytes));
    final Decoder decoder = new Decoder();

    try {
      Header header;
      while ((header = bitstream.readFrame()) != null) {
        final SampleBuffer output = (SampleBuffer) decoder.decodeFrame(header, bitstream);
        final short[] samples = output.getBuffer();
        final int sampleCount = output.getBufferLength();

        final boolean isSilent = IntStream.range(0, sampleCount)
            .noneMatch(i -> Math.abs(samples[i]) > SILENCE_THRESHOLD);

        silentFrames.add(isSilent);
        bitstream.closeFrame();
      }
    } finally {
      bitstream.close();
    }

    return silentFrames;
  }
}

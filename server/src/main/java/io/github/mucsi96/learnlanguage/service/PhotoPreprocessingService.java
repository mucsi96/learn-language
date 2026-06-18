package io.github.mucsi96.learnlanguage.service;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PhotoPreprocessingService {

  public record PreparedPage(byte[] imageData, String contentType) {
  }

  private static final String PNG_CONTENT_TYPE = "image/png";
  private static final double SPLIT_ASPECT_RATIO_THRESHOLD = 1.2;
  private static final double CENTER_BAND_START = 0.35;
  private static final double CENTER_BAND_END = 0.65;
  private static final double GUTTER_VALLEY_RATIO = 0.8;
  private static final int TARGET_DPI = 200;
  private static final double A4_LONG_EDGE_MM = 297.0;
  private static final double MM_PER_INCH = 25.4;
  private static final int A4_LONG_EDGE_PX = (int) Math.round(A4_LONG_EDGE_MM / MM_PER_INCH * TARGET_DPI);
  private static final int LUMINANCE_LEVELS = 256;

  public List<PreparedPage> prepare(byte[] imageData, String contentType) {
    final BufferedImage original = decode(imageData);

    if (original == null) {
      return List.of(new PreparedPage(imageData, contentType));
    }

    return splitIntoPages(original).stream()
        .map(this::downscale)
        .map(this::binarize)
        .map(this::encodePng)
        .map(bytes -> new PreparedPage(bytes, PNG_CONTENT_TYPE))
        .toList();
  }

  private BufferedImage decode(byte[] imageData) {
    try {
      return ImageIO.read(new ByteArrayInputStream(imageData));
    } catch (IOException e) {
      return null;
    }
  }

  private List<BufferedImage> splitIntoPages(BufferedImage image) {
    final int width = image.getWidth();
    final int height = image.getHeight();

    if ((double) width / height < SPLIT_ASPECT_RATIO_THRESHOLD) {
      return List.of(image);
    }

    final double[] columnMeans = IntStream.range(0, width)
        .mapToDouble(x -> IntStream.range(0, height)
            .mapToDouble(y -> luminance(image.getRGB(x, y)))
            .average()
            .orElse(255.0))
        .toArray();

    final double globalMean = Arrays.stream(columnMeans).average().orElse(255.0);
    final int bandStart = (int) Math.round(width * CENTER_BAND_START);
    final int bandEnd = (int) Math.round(width * CENTER_BAND_END);

    final int gutter = IntStream.range(bandStart, bandEnd)
        .boxed()
        .min(Comparator.comparingDouble(x -> columnMeans[x]))
        .orElse(-1);

    if (gutter < 0 || columnMeans[gutter] >= globalMean * GUTTER_VALLEY_RATIO) {
      return List.of(image);
    }

    return List.of(
        image.getSubimage(0, 0, gutter, height),
        image.getSubimage(gutter, 0, width - gutter, height));
  }

  private BufferedImage downscale(BufferedImage image) {
    final int width = image.getWidth();
    final int height = image.getHeight();
    final int longerEdge = Math.max(width, height);
    final double scale = Math.min(1.0, (double) A4_LONG_EDGE_PX / longerEdge);

    if (scale >= 1.0) {
      return image;
    }

    final int scaledWidth = (int) Math.round(width * scale);
    final int scaledHeight = (int) Math.round(height * scale);
    final BufferedImage scaled = new BufferedImage(scaledWidth, scaledHeight, BufferedImage.TYPE_INT_RGB);
    final Graphics2D g = scaled.createGraphics();

    try {
      g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
      g.drawImage(image, 0, 0, scaledWidth, scaledHeight, null);
    } finally {
      g.dispose();
    }

    return scaled;
  }

  private BufferedImage binarize(BufferedImage image) {
    final int width = image.getWidth();
    final int height = image.getHeight();

    final int[] histogram = new int[LUMINANCE_LEVELS];
    IntStream.range(0, width * height)
        .forEach(index -> histogram[(int) Math.round(luminance(image.getRGB(index % width, index / width)))]++);

    final double threshold = otsuThreshold(histogram, width * height);
    final BufferedImage blackAndWhite = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);

    IntStream.range(0, width * height).forEach(index -> {
      final int x = index % width;
      final int y = index / width;
      final int color = luminance(image.getRGB(x, y)) <= threshold ? 0x000000 : 0xFFFFFF;
      blackAndWhite.setRGB(x, y, color);
    });

    return blackAndWhite;
  }

  private double otsuThreshold(int[] histogram, int totalPixels) {
    final double totalIntensity = IntStream.range(0, LUMINANCE_LEVELS)
        .mapToDouble(level -> (double) level * histogram[level])
        .sum();

    return IntStream.range(1, LUMINANCE_LEVELS)
        .boxed()
        .max(Comparator.comparingDouble(t -> betweenClassVariance(histogram, totalPixels, totalIntensity, t)))
        .orElse(LUMINANCE_LEVELS / 2);
  }

  private double betweenClassVariance(int[] histogram, int totalPixels, double totalIntensity, int threshold) {
    final long backgroundWeight = IntStream.range(0, threshold).mapToLong(level -> histogram[level]).sum();
    final long foregroundWeight = totalPixels - backgroundWeight;

    if (backgroundWeight == 0 || foregroundWeight == 0) {
      return -1.0;
    }

    final double backgroundIntensity = IntStream.range(0, threshold)
        .mapToDouble(level -> (double) level * histogram[level])
        .sum();
    final double backgroundMean = backgroundIntensity / backgroundWeight;
    final double foregroundMean = (totalIntensity - backgroundIntensity) / foregroundWeight;
    final double meanDifference = backgroundMean - foregroundMean;

    return (double) backgroundWeight * foregroundWeight * meanDifference * meanDifference;
  }

  private byte[] encodePng(BufferedImage image) {
    final ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    try {
      ImageIO.write(image, "png", outputStream);
    } catch (IOException e) {
      throw new RuntimeException("Failed to encode preprocessed page", e);
    }
    return outputStream.toByteArray();
  }

  private double luminance(int rgb) {
    final int r = (rgb >> 16) & 0xFF;
    final int g = (rgb >> 8) & 0xFF;
    final int b = rgb & 0xFF;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
}

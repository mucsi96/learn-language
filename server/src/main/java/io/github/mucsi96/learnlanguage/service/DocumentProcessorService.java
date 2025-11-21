package io.github.mucsi96.learnlanguage.service;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import io.github.mucsi96.learnlanguage.model.RegionRequest;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DocumentProcessorService {

  private final FileStorageService fileStorageService;
  private final WordIdService wordIdService;

  public PageResponse processDocument(Source source, int pageNumber) throws IOException {
    byte[] bytes = fetchAndCacheFile("sources/" + source.getFileName());

    try (PDDocument document = Loader.loadPDF(bytes)) {
      var mediaBox = document.getPage(pageNumber - 1).getMediaBox();
      var width = mediaBox.getWidth();
      var height = mediaBox.getHeight();
      var spans = new SpanExtractor().extractSpans(bytes, pageNumber).stream()
          .map((SpanExtractor.Span span) -> {
            String searchTerm = Pattern.compile("\\s?[,/(-]").split(span.getText())[0].strip();
            String id = wordIdService.generateWordId(span.getText());
            return PageResponse.Span.builder()
                .id(id)
                .text(span.getText())
                .searchTerm(searchTerm)
                .bbox(PageResponse.Span.Bbox.builder()
                    .x(span.getX())
                    .y(span.getY())
                    .width(span.getWidth())
                    .height(span.getHeight())
                    .build())
                .build();
          })
          .collect(Collectors.toList());

      return PageResponse.builder()
          .width(width)
          .height(height)
          .number(pageNumber)
          .sourceId(source.getId())
          .sourceName(source.getName())
          .spans(spans)
          .build();
    }
  }

  public byte[] getPageArea(Source source, int pageNumber, double x, double y, double width, double height)
      throws IOException {
    byte[] bytes = fetchAndCacheFile("sources/" + source.getFileName());

    try (PDDocument document = Loader.loadPDF(bytes)) {
      var mediaBox = document.getPage(pageNumber - 1).getMediaBox();
      var pageWidth = mediaBox.getWidth();
      var pageHeight = mediaBox.getHeight();

      PDFRenderer renderer = new PDFRenderer(document);
      float scale = 2;
      var image = renderer
          .renderImage(pageNumber - 1, scale);
      var croppedImage = image.getSubimage(
          (int) Math.round((x / pageWidth) * image.getWidth()),
          (int) Math.round((y / pageHeight) * image.getHeight()),
          (int) Math.round((width / pageWidth) * image.getWidth()),
          (int) Math.round((height / pageHeight) * image.getHeight()));
      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      ImageIO.write(croppedImage, "png", outputStream);
      // Write image to file for debugging purpose
      // ImageIO.write(croppedImage, "png", Path.of("image.png").toFile());
      return outputStream.toByteArray();
    }
  }

  public byte[] getCombinedRegions(Source source, List<RegionRequest> regions) throws IOException {
    byte[] bytes = fetchAndCacheFile("sources/" + source.getFileName());

    try (PDDocument document = Loader.loadPDF(bytes)) {
      PDFRenderer renderer = new PDFRenderer(document);
      float scale = 2;

      BufferedImage[] regionImages = new BufferedImage[regions.size()];
      int totalHeight = 0;
      int maxWidth = 0;

      for (int i = 0; i < regions.size(); i++) {
        RegionRequest region = regions.get(i);
        int pageIndex = region.getPageNumber() - 1;

        var mediaBox = document.getPage(pageIndex).getMediaBox();
        var pageWidth = mediaBox.getWidth();
        var pageHeight = mediaBox.getHeight();

        var pageImage = renderer.renderImage(pageIndex, scale);
        var croppedImage = pageImage.getSubimage(
            (int) Math.round((region.getX() / pageWidth) * pageImage.getWidth()),
            (int) Math.round((region.getY() / pageHeight) * pageImage.getHeight()),
            (int) Math.round((region.getWidth() / pageWidth) * pageImage.getWidth()),
            (int) Math.round((region.getHeight() / pageHeight) * pageImage.getHeight()));

        regionImages[i] = croppedImage;
        totalHeight += croppedImage.getHeight();
        maxWidth = Math.max(maxWidth, croppedImage.getWidth());
      }

      BufferedImage combinedImage = new BufferedImage(maxWidth, totalHeight, BufferedImage.TYPE_INT_RGB);
      Graphics2D g2d = combinedImage.createGraphics();

      int currentY = 0;
      for (BufferedImage regionImage : regionImages) {
        g2d.drawImage(regionImage, 0, currentY, null);
        currentY += regionImage.getHeight();
      }
      g2d.dispose();

      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      ImageIO.write(combinedImage, "png", outputStream);
      return outputStream.toByteArray();
    }
  }

  private byte[] fetchAndCacheFile(String filePath) throws IOException {
    Path cachePath = Path.of(System.getProperty("java.io.tmpdir"), filePath);
    if (Files.exists(cachePath)) {
      return Files.readAllBytes(cachePath);
    }

    byte[] fileData = fileStorageService.fetchFile(filePath).toBytes();
    Files.createDirectories(cachePath.getParent());
    Files.write(cachePath, fileData);
    return fileData;
  }
}

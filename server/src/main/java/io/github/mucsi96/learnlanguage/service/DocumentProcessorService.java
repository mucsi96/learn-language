package io.github.mucsi96.learnlanguage.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Collections;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Document;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DocumentProcessorService {

  private final FileStorageService fileStorageService;
  private final WordIdService wordIdService;
  private final DocumentRepository documentRepository;

  public PageResponse processDocument(Source source, int pageNumber) throws IOException {
    if (source.getSourceType() == SourceType.IMAGES) {
      return processImageDocument(source, pageNumber);
    }
    return processPdfDocument(source, pageNumber);
  }

  private PageResponse processImageDocument(Source source, int pageNumber) throws IOException {
    Document document = documentRepository.findBySourceAndPageNumber(source, pageNumber)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found for page " + pageNumber));

    byte[] bytes = fetchAndCacheFile("sources/" + source.getId() + "/" + document.getFileName());
    BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));

    String base64Image = Base64.getEncoder().encodeToString(bytes);
    String mimeType = getMimeType(document.getFileName());

    return PageResponse.builder()
        .width(image.getWidth())
        .height(image.getHeight())
        .number(pageNumber)
        .sourceId(source.getId())
        .sourceName(source.getName())
        .sourceType(SourceType.IMAGES)
        .imageData("data:" + mimeType + ";base64," + base64Image)
        .spans(Collections.emptyList())
        .build();
  }

  private PageResponse processPdfDocument(Source source, int pageNumber) throws IOException {
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
          .sourceType(SourceType.PDF)
          .spans(spans)
          .build();
    }
  }

  public byte[] getPageArea(Source source, int pageNumber, double x, double y, double width, double height)
      throws IOException {
    if (source.getSourceType() == SourceType.IMAGES) {
      return getImagePageArea(source, pageNumber, x, y, width, height);
    }
    return getPdfPageArea(source, pageNumber, x, y, width, height);
  }

  private byte[] getImagePageArea(Source source, int pageNumber, double x, double y, double width, double height)
      throws IOException {
    Document document = documentRepository.findBySourceAndPageNumber(source, pageNumber)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found for page " + pageNumber));

    byte[] bytes = fetchAndCacheFile("sources/" + source.getId() + "/" + document.getFileName());
    BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));

    int imageWidth = image.getWidth();
    int imageHeight = image.getHeight();

    var croppedImage = image.getSubimage(
        (int) Math.round((x / imageWidth) * imageWidth),
        (int) Math.round((y / imageHeight) * imageHeight),
        (int) Math.round((width / imageWidth) * imageWidth),
        (int) Math.round((height / imageHeight) * imageHeight));

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    ImageIO.write(croppedImage, "png", outputStream);
    return outputStream.toByteArray();
  }

  private byte[] getPdfPageArea(Source source, int pageNumber, double x, double y, double width, double height)
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
      return outputStream.toByteArray();
    }
  }

  private String getMimeType(String fileName) {
    String lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".png")) {
      return "image/png";
    } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
      return "image/jpeg";
    } else if (lowerName.endsWith(".gif")) {
      return "image/gif";
    } else if (lowerName.endsWith(".webp")) {
      return "image/webp";
    }
    return "image/png";
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

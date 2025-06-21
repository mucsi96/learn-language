package io.github.mucsi96.learnlanguage.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DocumentProcessorService {

  private final BlobStorageService blobStorageService;
  private final WordIdService wordIdService;

  public PageResponse processDocument(Source source, int pageNumber) throws IOException {
    byte[] bytes = fetchAndCacheBlob("sources/" + source.getFileName());

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
                    .x(span.getX() / width)
                    .y(span.getY() / width)
                    .width(span.getWidth() / width)
                    .height(span.getHeight() / width)
                    .build())
                .build();
          })
          .collect(Collectors.toList());

      return PageResponse.builder()
          .height(height / width)
          .number(pageNumber)
          .sourceId(source.getId())
          .sourceName(source.getName())
          .spans(spans)
          .build();
    }
  }

  public byte[] getPageArea(Source source, int pageNumber, double x, double y, double width, double height)
      throws IOException {
    byte[] bytes = fetchAndCacheBlob("sources/" + source.getFileName());

    try (PDDocument document = Loader.loadPDF(bytes)) {
      var mediaBox = document.getPage(pageNumber - 1).getMediaBox();
      PDFRenderer renderer = new PDFRenderer(document);
      float scale = 2;
      var image = renderer
          .renderImage(pageNumber - 1, scale, ImageType.RGB)
          .getSubimage(
              (int) Math.round(x * mediaBox.getWidth() * scale),
              (int) Math.round(y * mediaBox.getWidth() * scale),
              (int) Math.round(width * mediaBox.getWidth() * scale),
              (int) Math.round(height * mediaBox.getWidth() * scale));
      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      ImageIO.write(image, "png", outputStream);
      // Write image to file for debugging purpose
      ImageIO.write(image, "png", Path.of("image.png").toFile());
      return outputStream.toByteArray();
    }
  }

  private byte[] fetchAndCacheBlob(String blobName) throws IOException {
    Path cachePath = Path.of(System.getProperty("java.io.tmpdir"), blobName);
    if (Files.exists(cachePath)) {
      return Files.readAllBytes(cachePath);
    }

    byte[] blobData = blobStorageService.fetchBlob(blobName).toBytes();
    Files.createDirectories(cachePath.getParent());
    Files.write(cachePath, blobData);
    return blobData;
  }
}

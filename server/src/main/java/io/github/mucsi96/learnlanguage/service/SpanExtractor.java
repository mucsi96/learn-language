package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.fontbox.util.BoundingBox;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType3Font;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.awt.Shape;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;

import lombok.Builder;
import lombok.Data;

// Based on https://github.com/apache/pdfbox/blob/trunk/examples/src/main/java/org/apache/pdfbox/examples/util/DrawPrintTextLocations.java
// blue box
public class SpanExtractor extends PDFTextStripper {

  @Data
  @Builder
  public static class Span {
    private String text;
    private double x, y, width, height;
    private String font;
    private double fontSize;
  }

  private final List<Span> spans = new ArrayList<>();
  private AffineTransform flipAT;
  private AffineTransform rotateAT;

  @Override
  protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
    if (text.trim().isEmpty())
      return;

    List<TextPosition> currentChars = new ArrayList<>();
    for (int i = 0; i < textPositions.size(); i++) {
      TextPosition tp = textPositions.get(i);
      String currentText = currentChars.stream()
          .map(TextPosition::getUnicode)
          .reduce("", String::concat)
          .trim();

      if (!currentChars.isEmpty() && currentChars.size() >= 2 &&
          currentChars.get(currentChars.size() - 2).getUnicode().equals(" ") &&
          currentChars.get(currentChars.size() - 1).getUnicode().equals(" ") &&
          !tp.getUnicode().equals(" ") && !currentText.isEmpty()) {
        // Split here
        addSpanFromChars(currentChars);
        currentChars.clear();
      }
      currentChars.add(tp);
    }

    if (!currentChars.isEmpty()) {
      addSpanFromChars(currentChars);
    }
  }

  private void addSpanFromChars(List<TextPosition> chars) throws IOException {
    String text = chars.stream()
        .map(TextPosition::getUnicode)
        .reduce("", String::concat)
        .trim();

    if (text.isEmpty())
      return;

    double[] bbox = getBoundingBox(chars);
    spans.add(Span.builder()
        .text(text)
        .x(bbox[0])
        .y(bbox[1])
        .width(bbox[2] - bbox[0])
        .height(bbox[3])
        .font(chars.get(0).getFont().getName())
        .fontSize(chars.get(0).getFontSizeInPt())
        .build());
  }

  private double[] getBoundingBox(List<TextPosition> chars) throws IOException {
    double Xstart = Float.MAX_VALUE, Ystart = Float.MAX_VALUE;
    double Xend = 0, height = 0;

    for (TextPosition tp : chars) {
      if (tp.getUnicode().trim().length() > 0) {
        PDFont font = tp.getFont();
        BoundingBox bbox = font.getBoundingBox();
        AffineTransform at = tp.getTextMatrix().createAffineTransform();

        // advance width, bbox height (glyph space)
        float xadvance = font.getWidth(tp.getCharacterCodes()[0]); // todo: should iterate all chars
        var rect = new Rectangle2D.Float(0, bbox.getLowerLeftY(), xadvance, bbox.getHeight());
        if (font instanceof PDType3Font) {
          // bbox and font matrix are unscaled
          at.concatenate(font.getFontMatrix().createAffineTransform());
        } else {
          // bbox and font matrix are already scaled to 1000
          at.scale(1 / 1000f, 1 / 1000f);
        }
        Shape s = at.createTransformedShape(rect);
        s = flipAT.createTransformedShape(s);
        s = rotateAT.createTransformedShape(s);
        Xstart = Math.min(Xstart, s.getBounds2D().getX());
        Ystart = Math.min(Ystart, s.getBounds2D().getY());
        Xend = Math.max(Xend, s.getBounds2D().getX() + s.getBounds2D().getWidth());
        height = Math.max(height, s.getBounds2D().getHeight());

      }
    }

    return new double[] { Xstart, Ystart, Xend, height };
  }

  public List<Span> extractSpans(byte[] bytes, int pageNumber) throws IOException {
    try (PDDocument document = Loader.loadPDF(bytes)) {
      if (pageNumber < 1 || pageNumber > document.getNumberOfPages()) {
        throw new IllegalArgumentException("Invalid page number");
      }

      this.setStartPage(pageNumber);
      this.setEndPage(pageNumber);
      PDPage pdPage = document.getPage(pageNumber);
      PDRectangle cropBox = pdPage.getCropBox();

      // flip y-axis
      flipAT = new AffineTransform();
      flipAT.translate(0, pdPage.getBBox().getHeight());
      flipAT.scale(1, -1);

      // page may be rotated
      rotateAT = new AffineTransform();
      int rotation = pdPage.getRotation();
      switch (rotation) {
        case 90:
          rotateAT.translate(cropBox.getHeight(), 0);
          break;
        case 270:
          rotateAT.translate(0, cropBox.getWidth());
          break;
        case 180:
          rotateAT.translate(cropBox.getWidth(), cropBox.getHeight());
          break;
        default:
          break;
      }
      rotateAT.rotate(Math.toRadians(rotation));

      this.getText(document);
      return spans;
    }
  }
}

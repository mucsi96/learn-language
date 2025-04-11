package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import lombok.Builder;
import lombok.Data;

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

    @Override
    protected void writeString(String text, List<TextPosition> textPositions) {
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

    private void addSpanFromChars(List<TextPosition> chars) {
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

    private double[] getBoundingBox(List<TextPosition> chars) {
        double Xstart = Float.MAX_VALUE, Ystart = Float.MAX_VALUE;
        double Xend = 0, height = 0;

        for (TextPosition tp : chars) {
            if (tp.getUnicode().trim().length() > 0) {
                Xstart = Math.min(Xstart, tp.getXDirAdj());
                Ystart = Math.min(Ystart, tp.getYDirAdj());
                Xend = Math.max(Xend, tp.getXDirAdj() + tp.getWidthDirAdj());
                height = Math.max(height, tp.getHeightDir());
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
            this.getText(document);
            return spans;
        }
    }
}

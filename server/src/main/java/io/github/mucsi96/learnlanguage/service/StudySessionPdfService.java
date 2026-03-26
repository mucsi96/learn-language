package io.github.mucsi96.learnlanguage.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;

import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.createdOnOrAfter;
import static io.github.mucsi96.learnlanguage.repository.specification.StudySessionSpecifications.hasSourceId;

@Service
@RequiredArgsConstructor
public class StudySessionPdfService {

    private static final float MARGIN = 40;
    private static final float ROW_HEIGHT = 20;
    private static final float HEADER_HEIGHT = 25;
    private static final float TITLE_HEIGHT = 40;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final Pattern GRAMMAR_GAP_PATTERN = Pattern.compile("\\[([^\\]]+)\\]");

    private final StudySessionRepository studySessionRepository;
    private final ReviewLogRepository reviewLogRepository;

    @Transactional(readOnly = true)
    public Optional<byte[]> generateStruggledCardsPdf(String sourceId, LocalDateTime startOfDay) {
        return studySessionRepository.findOne(hasSourceId(sourceId).and(createdOnOrAfter(startOfDay)))
                .flatMap(session -> studySessionRepository.findWithCardsById(session.getId()))
                .map(session -> buildPdf(session, startOfDay));
    }

    private byte[] buildPdf(StudySession session, LocalDateTime startOfDay) {
        final List<String> cardIds = session.getCards().stream()
                .map(sc -> sc.getCard().getId())
                .toList();

        final List<ReviewLog> allReviews = reviewLogRepository
                .findByCardIdInAndReviewGreaterThanEqualOrderByIdAsc(cardIds, startOfDay);

        final Map<String, ReviewLog> firstReviewPerCard = allReviews.stream()
                .collect(Collectors.toMap(
                        rl -> rl.getCard().getId() + ":" + (rl.getLearningPartner() != null ? rl.getLearningPartner().getId() : "self"),
                        rl -> rl,
                        (first, second) -> first,
                        LinkedHashMap::new));

        final List<ReviewLog> struggledReviews = firstReviewPerCard.values().stream()
                .filter(rl -> rl.getRating() < 3)
                .toList();

        if (struggledReviews.isEmpty()) {
            return buildEmptyPdf(session);
        }

        final String sourceName = session.getSource().getName();
        final CardType cardType = session.getSource().getCardType();
        final String dateStr = LocalDate.now().format(DATE_FORMAT);

        if ("WITH_PARTNER".equals(session.getStudyMode())) {
            return buildPartnerModePdf(struggledReviews, sourceName, cardType, dateStr);
        }

        final List<Card> struggledCards = struggledReviews.stream()
                .map(ReviewLog::getCard)
                .distinct()
                .toList();

        return buildSinglePagePdf(struggledCards, sourceName, cardType, dateStr, null);
    }

    private byte[] buildPartnerModePdf(List<ReviewLog> struggledReviews, String sourceName,
            CardType cardType, String dateStr) {
        final String userName = getCurrentUserFirstName();

        final Map<String, List<ReviewLog>> byPerson = struggledReviews.stream()
                .collect(Collectors.groupingBy(
                        rl -> rl.getLearningPartner() != null ? rl.getLearningPartner().getName() : userName));

        try (final PDDocument document = new PDDocument()) {
            final PDFont regularFont = loadFont(document, "fonts/DejaVuSans.ttf");
            final PDFont boldFont = loadFont(document, "fonts/DejaVuSans-Bold.ttf");

            byPerson.forEach((personName, reviews) -> {
                final List<Card> cards = reviews.stream()
                        .map(ReviewLog::getCard)
                        .distinct()
                        .toList();
                addCardsPages(document, cards, sourceName, cardType, dateStr, personName, regularFont, boldFont);
            });

            if (document.getNumberOfPages() == 0) {
                addEmptyPage(document, sourceName, dateStr, regularFont, boldFont);
            }

            final ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private byte[] buildSinglePagePdf(List<Card> cards, String sourceName, CardType cardType,
            String dateStr, String personName) {
        try (final PDDocument document = new PDDocument()) {
            final PDFont regularFont = loadFont(document, "fonts/DejaVuSans.ttf");
            final PDFont boldFont = loadFont(document, "fonts/DejaVuSans-Bold.ttf");
            addCardsPages(document, cards, sourceName, cardType, dateStr, personName, regularFont, boldFont);
            final ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private byte[] buildEmptyPdf(StudySession session) {
        try (final PDDocument document = new PDDocument()) {
            final PDFont regularFont = loadFont(document, "fonts/DejaVuSans.ttf");
            final PDFont boldFont = loadFont(document, "fonts/DejaVuSans-Bold.ttf");
            addEmptyPage(document, session.getSource().getName(), LocalDate.now().format(DATE_FORMAT),
                    regularFont, boldFont);
            final ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private PDFont loadFont(PDDocument document, String classpath) throws IOException {
        try (final InputStream fontStream = new ClassPathResource(classpath).getInputStream()) {
            return PDType0Font.load(document, fontStream);
        }
    }

    private PDRectangle landscapeA4() {
        return new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
    }

    private void addEmptyPage(PDDocument document, String sourceName, String dateStr,
            PDFont regularFont, PDFont boldFont) {
        try {
            final PDPage page = new PDPage(landscapeA4());
            document.addPage(page);
            try (final PDPageContentStream cs = new PDPageContentStream(document, page)) {
                final float pageWidth = page.getMediaBox().getWidth();
                final float pageHeight = page.getMediaBox().getHeight();

                drawTitle(cs, sourceName + " - " + dateStr, pageWidth, pageHeight, boldFont);

                cs.beginText();
                cs.setFont(regularFont, 12);
                cs.newLineAtOffset(MARGIN, pageHeight - MARGIN - TITLE_HEIGHT - 30);
                cs.showText("No struggled cards in this session.");
                cs.endText();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to add empty page", e);
        }
    }

    private void addCardsPages(PDDocument document, List<Card> cards, String sourceName,
            CardType cardType, String dateStr, String personName, PDFont regularFont, PDFont boldFont) {
        final String title = sourceName + " - " + dateStr;

        final List<String> headers = getHeaders(cardType);
        final List<Float> colWidths = getColumnWidths(cardType);
        final List<List<String>> rows = cards.stream()
                .map(card -> getCardRow(card, cardType))
                .toList();

        renderPages(document, title, headers, colWidths, rows, personName, regularFont, boldFont);
    }

    private void renderPages(PDDocument document, String title, List<String> headers,
            List<Float> colWidths, List<List<String>> rows, String personName,
            PDFont regularFont, PDFont boldFont) {
        final int totalRows = rows.size();
        int renderedRows = 0;

        do {
            final PDPage page = new PDPage(landscapeA4());
            document.addPage(page);
            final float pageWidth = page.getMediaBox().getWidth();
            final float pageHeight = page.getMediaBox().getHeight();
            final float tableWidth = pageWidth - 2 * MARGIN;

            try (final PDPageContentStream cs = new PDPageContentStream(document, page)) {
                drawTitle(cs, title, pageWidth, pageHeight, boldFont);

                if (personName != null) {
                    drawPersonName(cs, personName, pageWidth, pageHeight, regularFont);
                }

                final float headerY = pageHeight - MARGIN - TITLE_HEIGHT;
                final float afterHeaderY = drawTableHeader(cs, headers, colWidths, MARGIN, headerY, tableWidth, boldFont);

                final int startRow = renderedRows;
                final float startY = afterHeaderY;
                final int rowsOnPage = IntStream.range(startRow, totalRows)
                        .takeWhile(i -> startY - (i - startRow + 1) * ROW_HEIGHT > MARGIN)
                        .map(i -> 1)
                        .sum();

                final int finalRenderedRows = renderedRows;
                IntStream.range(0, rowsOnPage).forEach(i -> {
                    final float rowY = startY - i * ROW_HEIGHT;
                    try {
                        drawTableRow(cs, rows.get(finalRenderedRows + i), colWidths, MARGIN, rowY, tableWidth, regularFont);
                    } catch (IOException e) {
                        throw new RuntimeException("Failed to draw row", e);
                    }
                });

                renderedRows += rowsOnPage;
            } catch (IOException e) {
                throw new RuntimeException("Failed to write PDF page", e);
            }
        } while (renderedRows < totalRows);
    }

    private void drawTitle(PDPageContentStream cs, String title, float pageWidth, float pageHeight,
            PDFont font) throws IOException {
        cs.beginText();
        cs.setFont(font, 16);
        final float titleWidth = font.getStringWidth(title) / 1000 * 16;
        cs.newLineAtOffset((pageWidth - titleWidth) / 2, pageHeight - MARGIN - 20);
        cs.showText(title);
        cs.endText();
    }

    private void drawPersonName(PDPageContentStream cs, String personName, float pageWidth,
            float pageHeight, PDFont font) throws IOException {
        cs.beginText();
        cs.setFont(font, 10);
        final float nameWidth = font.getStringWidth(personName) / 1000 * 10;
        cs.newLineAtOffset(pageWidth - MARGIN - nameWidth, pageHeight - MARGIN - 12);
        cs.showText(personName);
        cs.endText();
    }

    private float drawTableHeader(PDPageContentStream cs, List<String> headers, List<Float> colWidths,
            float x, float y, float tableWidth, PDFont font) throws IOException {
        cs.setNonStrokingColor(0.85f, 0.85f, 0.85f);
        cs.addRect(x, y - HEADER_HEIGHT, tableWidth, HEADER_HEIGHT);
        cs.fill();

        cs.setNonStrokingColor(0f, 0f, 0f);
        cs.setLineWidth(0.5f);
        cs.addRect(x, y - HEADER_HEIGHT, tableWidth, HEADER_HEIGHT);
        cs.stroke();

        IntStream.range(0, headers.size()).forEach(i -> {
            final float cellX = computeCellX(colWidths, tableWidth, x, i);
            final float cellWidth = colWidths.get(i) * tableWidth;
            try {
                if (i > 0) {
                    cs.moveTo(cellX, y);
                    cs.lineTo(cellX, y - HEADER_HEIGHT);
                    cs.stroke();
                }
                cs.beginText();
                cs.setFont(font, 9);
                cs.newLineAtOffset(cellX + 5, y - HEADER_HEIGHT + 8);
                cs.showText(headers.get(i));
                cs.endText();
            } catch (IOException e) {
                throw new RuntimeException("Failed to draw header cell", e);
            }
        });

        return y - HEADER_HEIGHT;
    }

    private void drawTableRow(PDPageContentStream cs, List<String> cells, List<Float> colWidths,
            float x, float y, float tableWidth, PDFont font) throws IOException {
        cs.setNonStrokingColor(0f, 0f, 0f);
        cs.setLineWidth(0.3f);
        cs.addRect(x, y - ROW_HEIGHT, tableWidth, ROW_HEIGHT);
        cs.stroke();

        IntStream.range(0, cells.size()).forEach(i -> {
            final float cellX = computeCellX(colWidths, tableWidth, x, i);
            final float cellWidth = colWidths.get(i) * tableWidth;
            try {
                if (i > 0) {
                    cs.moveTo(cellX, y);
                    cs.lineTo(cellX, y - ROW_HEIGHT);
                    cs.stroke();
                }
                final String text = truncateText(cells.get(i), font, 8, cellWidth - 10);
                cs.beginText();
                cs.setFont(font, 8);
                cs.newLineAtOffset(cellX + 5, y - ROW_HEIGHT + 6);
                cs.showText(text);
                cs.endText();
            } catch (IOException e) {
                throw new RuntimeException("Failed to draw row cell", e);
            }
        });
    }

    private float computeCellX(List<Float> colWidths, float tableWidth, float x, int index) {
        return x + (float) IntStream.range(0, index)
                .mapToDouble(i -> colWidths.get(i) * tableWidth)
                .sum();
    }

    private String truncateText(String text, PDFont font, float fontSize, float maxWidth) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        try {
            final float textWidth = font.getStringWidth(text) / 1000 * fontSize;
            if (textWidth <= maxWidth) {
                return text;
            }
            return IntStream.iterate(text.length() - 1, len -> len > 0, len -> len - 1)
                    .mapToObj(len -> text.substring(0, len) + "...")
                    .filter(candidate -> {
                        try {
                            return font.getStringWidth(candidate) / 1000 * fontSize <= maxWidth;
                        } catch (IOException e) {
                            return true;
                        }
                    })
                    .findFirst()
                    .orElse("...");
        } catch (IOException e) {
            return text.substring(0, Math.min(text.length(), 20));
        }
    }

    private List<String> getHeaders(CardType cardType) {
        if (cardType == CardType.GRAMMAR) {
            return List.of("#", "German (Front)", "English", "Answer");
        }
        if (cardType == CardType.SPEECH) {
            return List.of("#", "Hungarian (Front)", "German (Back)", "English");
        }
        return List.of("#", "Hungarian", "Hungarian Example", "German", "Forms", "German Example");
    }

    private List<Float> getColumnWidths(CardType cardType) {
        if (cardType == CardType.GRAMMAR) {
            return List.of(0.05f, 0.40f, 0.30f, 0.25f);
        }
        if (cardType == CardType.SPEECH) {
            return List.of(0.05f, 0.35f, 0.32f, 0.28f);
        }
        return List.of(0.04f, 0.14f, 0.26f, 0.14f, 0.16f, 0.26f);
    }

    private List<String> getCardRow(Card card, CardType cardType) {
        final CardData data = card.getData();
        final String pageNum = String.valueOf(card.getSourcePageNumber());

        if (cardType == CardType.GRAMMAR) {
            final String deSentence = getSelectedExample(data).map(ExampleData::getDe).orElse("");
            final String enSentence = getSelectedExample(data).map(ExampleData::getEn).orElse("");
            final String maskedSentence = GRAMMAR_GAP_PATTERN.matcher(deSentence)
                    .replaceAll(mr -> "_".repeat(mr.group(1).length()));
            final String gapWords = extractGapWords(deSentence);
            return List.of(pageNum, maskedSentence, enSentence, gapWords);
        }

        if (cardType == CardType.SPEECH) {
            final String huSentence = getSelectedExample(data).map(ExampleData::getHu).orElse("");
            final String deSentence = getSelectedExample(data).map(ExampleData::getDe).orElse("");
            final String enSentence = getSelectedExample(data).map(ExampleData::getEn).orElse("");
            return List.of(pageNum, huSentence, deSentence, enSentence);
        }

        final String huTranslation = data.getTranslation() != null ? data.getTranslation().getOrDefault("hu", "") : "";
        final String huExample = getSelectedExample(data).map(ExampleData::getHu).orElse("");
        final String word = data.getWord() != null ? data.getWord() : "";
        final String forms = data.getForms() != null ? String.join(", ", data.getForms()) : "";
        final String deExample = getSelectedExample(data).map(ExampleData::getDe).orElse("");
        return List.of(pageNum, huTranslation, huExample, word, forms, deExample);
    }

    private String extractGapWords(String sentence) {
        final Matcher matcher = GRAMMAR_GAP_PATTERN.matcher(sentence);
        final List<String> gaps = matcher.results()
                .map(mr -> mr.group(1))
                .toList();
        return String.join(", ", gaps);
    }

    private Optional<ExampleData> getSelectedExample(CardData data) {
        if (data.getExamples() == null || data.getExamples().isEmpty()) {
            return Optional.empty();
        }
        return data.getExamples().stream()
                .filter(e -> Boolean.TRUE.equals(e.getIsSelected()))
                .findFirst()
                .or(() -> Optional.of(data.getExamples().getFirst()));
    }

    private String getCurrentUserFirstName() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            final String givenName = jwt.getClaimAsString("given_name");
            if (givenName != null && !givenName.isBlank()) {
                return givenName;
            }
            final String name = jwt.getClaimAsString("name");
            if (name != null && !name.isBlank()) {
                return name.split(" ")[0];
            }
        }
        return "Me";
    }
}

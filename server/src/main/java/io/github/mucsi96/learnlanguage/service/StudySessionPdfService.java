package io.github.mucsi96.learnlanguage.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
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
    private static final float SECTION_GAP = 30;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

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
                .map(rl -> rl.getCard())
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
            byPerson.forEach((personName, reviews) -> {
                final List<Card> cards = reviews.stream()
                        .map(ReviewLog::getCard)
                        .distinct()
                        .toList();
                addCardsPage(document, cards, sourceName, cardType, dateStr, personName);
            });

            if (document.getNumberOfPages() == 0) {
                addEmptyPage(document, sourceName, dateStr);
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
            addCardsPage(document, cards, sourceName, cardType, dateStr, personName);
            final ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private byte[] buildEmptyPdf(StudySession session) {
        try (final PDDocument document = new PDDocument()) {
            addEmptyPage(document, session.getSource().getName(), LocalDate.now().format(DATE_FORMAT));
            final ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private void addEmptyPage(PDDocument document, String sourceName, String dateStr) {
        try {
            final PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (final PDPageContentStream cs = new PDPageContentStream(document, page)) {
                final PDType1Font boldFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                final float pageWidth = page.getMediaBox().getWidth();
                final float pageHeight = page.getMediaBox().getHeight();

                drawTitle(cs, sourceName + " - " + dateStr, pageWidth, pageHeight, boldFont);

                final PDType1Font regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
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

    private void addCardsPage(PDDocument document, List<Card> cards, String sourceName,
            CardType cardType, String dateStr, String personName) {
        final String title = personName != null
                ? sourceName + " - " + personName + " - " + dateStr
                : sourceName + " - " + dateStr;

        final String[] headers = getHeaders(cardType);
        final float[] colWidths = getColumnWidths(cardType);

        int cardIndex = 0;
        while (cardIndex < cards.size()) {
            final PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            final float pageWidth = page.getMediaBox().getWidth();
            final float pageHeight = page.getMediaBox().getHeight();
            final float tableWidth = pageWidth - 2 * MARGIN;

            try (final PDPageContentStream cs = new PDPageContentStream(document, page)) {
                final PDType1Font boldFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                final PDType1Font regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

                drawTitle(cs, title, pageWidth, pageHeight, boldFont);
                float y = pageHeight - MARGIN - TITLE_HEIGHT;

                y = drawTableHeader(cs, headers, colWidths, MARGIN, y, tableWidth, boldFont);

                while (cardIndex < cards.size() && y > MARGIN + ROW_HEIGHT) {
                    final String[] row = getCardRow(cards.get(cardIndex), cardType);
                    y = drawTableRow(cs, row, colWidths, MARGIN, y, tableWidth, regularFont);
                    cardIndex++;
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to write PDF page", e);
            }
        }
    }

    private void drawTitle(PDPageContentStream cs, String title, float pageWidth, float pageHeight,
            PDType1Font font) throws IOException {
        cs.beginText();
        cs.setFont(font, 16);
        final float titleWidth = font.getStringWidth(title) / 1000 * 16;
        cs.newLineAtOffset((pageWidth - titleWidth) / 2, pageHeight - MARGIN - 20);
        cs.showText(title);
        cs.endText();
    }

    private float drawTableHeader(PDPageContentStream cs, String[] headers, float[] colWidths,
            float x, float y, float tableWidth, PDType1Font font) throws IOException {
        cs.setNonStrokingColor(0.85f, 0.85f, 0.85f);
        cs.addRect(x, y - HEADER_HEIGHT, tableWidth, HEADER_HEIGHT);
        cs.fill();

        cs.setNonStrokingColor(0f, 0f, 0f);
        cs.setLineWidth(0.5f);
        cs.addRect(x, y - HEADER_HEIGHT, tableWidth, HEADER_HEIGHT);
        cs.stroke();

        float cellX = x;
        for (int i = 0; i < headers.length; i++) {
            final float cellWidth = colWidths[i] * tableWidth;
            if (i > 0) {
                cs.moveTo(cellX, y);
                cs.lineTo(cellX, y - HEADER_HEIGHT);
                cs.stroke();
            }
            cs.beginText();
            cs.setFont(font, 9);
            cs.newLineAtOffset(cellX + 5, y - HEADER_HEIGHT + 8);
            cs.showText(headers[i]);
            cs.endText();
            cellX += cellWidth;
        }

        return y - HEADER_HEIGHT;
    }

    private float drawTableRow(PDPageContentStream cs, String[] cells, float[] colWidths,
            float x, float y, float tableWidth, PDType1Font font) throws IOException {
        cs.setNonStrokingColor(0f, 0f, 0f);
        cs.setLineWidth(0.3f);
        cs.addRect(x, y - ROW_HEIGHT, tableWidth, ROW_HEIGHT);
        cs.stroke();

        float cellX = x;
        for (int i = 0; i < cells.length; i++) {
            final float cellWidth = colWidths[i] * tableWidth;
            if (i > 0) {
                cs.moveTo(cellX, y);
                cs.lineTo(cellX, y - ROW_HEIGHT);
                cs.stroke();
            }
            final String text = truncateText(cells[i], font, 8, cellWidth - 10);
            cs.beginText();
            cs.setFont(font, 8);
            cs.newLineAtOffset(cellX + 5, y - ROW_HEIGHT + 6);
            cs.showText(text);
            cs.endText();
            cellX += cellWidth;
        }

        return y - ROW_HEIGHT;
    }

    private String truncateText(String text, PDType1Font font, float fontSize, float maxWidth) {
        try {
            if (text == null || text.isEmpty()) {
                return "";
            }
            final String sanitized = sanitizeForPdf(text);
            final float textWidth = font.getStringWidth(sanitized) / 1000 * fontSize;
            if (textWidth <= maxWidth) {
                return sanitized;
            }
            String truncated = sanitized;
            while (truncated.length() > 1) {
                truncated = truncated.substring(0, truncated.length() - 1);
                final float w = font.getStringWidth(truncated + "...") / 1000 * fontSize;
                if (w <= maxWidth) {
                    return truncated + "...";
                }
            }
            return "...";
        } catch (IOException e) {
            return text != null ? text.substring(0, Math.min(text.length(), 20)) : "";
        }
    }

    private String sanitizeForPdf(String text) {
        if (text == null) {
            return "";
        }
        final StringBuilder sb = new StringBuilder(text.length());
        text.chars().forEach(cp -> {
            if (cp >= 32 && cp <= 126) {
                sb.append((char) cp);
            } else {
                sb.append('?');
            }
        });
        return sb.toString();
    }

    private String[] getHeaders(CardType cardType) {
        if (cardType == CardType.GRAMMAR) {
            return new String[]{"#", "German (Front)", "English", "German (Answer)"};
        }
        if (cardType == CardType.SPEECH) {
            return new String[]{"#", "Hungarian (Front)", "German (Back)", "English"};
        }
        return new String[]{"#", "Hungarian (Front)", "German (Back)", "Type", "Gender", "Example (DE)"};
    }

    private float[] getColumnWidths(CardType cardType) {
        if (cardType == CardType.GRAMMAR) {
            return new float[]{0.06f, 0.38f, 0.28f, 0.28f};
        }
        if (cardType == CardType.SPEECH) {
            return new float[]{0.06f, 0.37f, 0.30f, 0.27f};
        }
        return new float[]{0.05f, 0.22f, 0.20f, 0.10f, 0.10f, 0.33f};
    }

    private String[] getCardRow(Card card, CardType cardType) {
        final CardData data = card.getData();
        if (cardType == CardType.GRAMMAR) {
            final String deSentence = getSelectedExample(data).map(ExampleData::getDe).orElse("");
            final String enSentence = getSelectedExample(data).map(ExampleData::getEn).orElse("");
            return new String[]{String.valueOf(card.getSourcePageNumber()), deSentence, enSentence, deSentence};
        }
        if (cardType == CardType.SPEECH) {
            final String huSentence = getSelectedExample(data).map(ExampleData::getHu).orElse("");
            final String deSentence = getSelectedExample(data).map(ExampleData::getDe).orElse("");
            final String enSentence = getSelectedExample(data).map(ExampleData::getEn).orElse("");
            return new String[]{String.valueOf(card.getSourcePageNumber()), huSentence, deSentence, enSentence};
        }
        final String huTranslation = data.getTranslation() != null ? data.getTranslation().getOrDefault("hu", "") : "";
        final String word = data.getWord() != null ? data.getWord() : "";
        final String type = data.getType() != null ? data.getType() : "";
        final String gender = data.getGender() != null ? data.getGender() : "";
        final String example = getSelectedExample(data).map(ExampleData::getDe).orElse("");
        return new String[]{String.valueOf(card.getSourcePageNumber()), huTranslation, word, type, gender, example};
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

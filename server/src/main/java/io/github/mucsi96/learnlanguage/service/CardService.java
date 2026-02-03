package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardTableResponse;
import io.github.mucsi96.learnlanguage.model.CardTableRow;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.service.cardtype.CardTypeStrategyFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CardService {

  public static record SourceCardCount(String sourceId, Integer count) {}

  private static final Map<String, String> SORT_FIELD_MAP = Map.of(
      "label", "label",
      "reviewCount", "c.reps",
      "lastReviewDate", "last_review_date",
      "lastReviewGrade", "last_review_grade",
      "lastReviewPerson", "last_review_person",
      "state", "display_state"
  );

  private final CardRepository cardRepository;
  private final CardTypeStrategyFactory cardTypeStrategyFactory;

  @PersistenceContext
  private EntityManager entityManager;

  public Optional<Card> getCardById(String id) {
    return cardRepository.findById(id);
  }

  public List<Card> getCardsByIds(List<String> ids) {
    return cardRepository.findByIdIn(ids);
  }

  public Card saveCard(Card card) {
    return cardRepository.save(card);
  }

  public void deleteCardById(String id) {
    cardRepository.deleteById(id);
  }

  public List<SourceDueCardCountResponse> getDueCardCountsBySource() {
    return cardRepository.findTop50MostDueGroupedByStateAndSourceId()
        .stream()
        .map(record -> SourceDueCardCountResponse.builder()
            .sourceId((String) record[0])
            .state((String) record[1])
            .count(((Long) record[2]))
            .build())
        .toList();
  }

  public List<Card> getCardsByReadiness(String readiness) {
    return cardRepository.findByReadinessOrderByDueAsc(readiness);
  }

  public List<Card> getCardsMissingAudio() {
    return cardRepository.findAll()
        .stream()
        .filter(card -> !card.isInReview())
        .filter(this::isMissingAudio)
        .toList();
  }

  public List<Card> getRandomReadyCards(int limit) {
    return cardRepository.findRandomReadyCards(limit);
  }

  public List<SourceCardCount> getCardCountsBySource() {
    return cardRepository.countBySourceGroupBySource()
        .stream()
        .map(record -> new SourceCardCount(
            (String) record[0],
            ((Long) record[1]).intValue())
        )
        .toList();
  }

  @Transactional
  public void updateReadinessForCards(List<String> cardIds, String readiness) {
    final List<Card> cards = cardRepository.findByIdIn(cardIds);
    cards.forEach(card -> card.setReadiness(readiness));
    cardRepository.saveAll(cards);
  }

  @Transactional(readOnly = true)
  @SuppressWarnings("unchecked")
  public CardTableResponse getCardsForTable(
      String sourceId, int startRow, int endRow,
      String sortField, String sortDir,
      String stateFilter, Integer lastReviewGradeFilter,
      Integer minReviews, Integer maxReviews,
      String lastReviewDateRange) {

    final String safeSortColumn = SORT_FIELD_MAP.getOrDefault(sortField, "label");
    final String safeSortDir = "desc".equalsIgnoreCase(sortDir) ? "DESC" : "ASC";

    final String cte = """
        WITH latest_reviews AS (
            SELECT DISTINCT ON (card_id) card_id, rating, review, learning_partner_id
            FROM learn_language.review_logs
            ORDER BY card_id, review DESC
        )
        """;

    final StringBuilder whereClause = new StringBuilder("WHERE c.source_id = :sourceId");
    final Map<String, Object> params = new HashMap<>();
    params.put("sourceId", sourceId);

    if (stateFilter != null && !stateFilter.isEmpty()) {
      if ("KNOWN".equals(stateFilter)) {
        whereClause.append(" AND c.readiness = 'KNOWN'");
      } else {
        whereClause.append(" AND c.state = :stateFilter AND c.readiness != 'KNOWN'");
        params.put("stateFilter", stateFilter);
      }
    }

    if (lastReviewGradeFilter != null) {
      whereClause.append(" AND lr.rating = :lastReviewGrade");
      params.put("lastReviewGrade", lastReviewGradeFilter);
    }

    if (minReviews != null) {
      whereClause.append(" AND c.reps >= :minReviews");
      params.put("minReviews", minReviews);
    }

    if (maxReviews != null) {
      whereClause.append(" AND c.reps <= :maxReviews");
      params.put("maxReviews", maxReviews);
    }

    if (lastReviewDateRange != null && !lastReviewDateRange.isEmpty()) {
      switch (lastReviewDateRange) {
        case "today" -> whereClause.append(" AND lr.review::date = CURRENT_DATE");
        case "last7days" -> whereClause.append(" AND lr.review >= NOW() - INTERVAL '7 days'");
        case "last30days" -> whereClause.append(" AND lr.review >= NOW() - INTERVAL '30 days'");
        case "over30days" -> whereClause.append(" AND lr.review < NOW() - INTERVAL '30 days'");
        case "never" -> whereClause.append(" AND lr.review IS NULL");
        default -> { }
      }
    }

    final String selectFields = """
        SELECT c.id, c.data->>'word' as label, c.reps as review_count,
               CASE WHEN c.readiness = 'KNOWN' THEN 'KNOWN' ELSE c.state END as display_state,
               c.source_page_number,
               lr.rating as last_review_grade,
               lr.review as last_review_date,
               lp.name as last_review_person
        FROM learn_language.cards c
        LEFT JOIN latest_reviews lr ON c.id = lr.card_id
        LEFT JOIN learn_language.learning_partners lp ON lr.learning_partner_id = lp.id
        """;

    final String fullSelect = selectFields + whereClause;
    final String countSql = cte + "SELECT COUNT(*) FROM (" + fullSelect + ") as filtered";
    final String dataSql = cte + fullSelect
        + " ORDER BY " + safeSortColumn + " " + safeSortDir + " NULLS LAST";

    final Query countQuery = entityManager.createNativeQuery(countSql);
    final Query dataQuery = entityManager.createNativeQuery(dataSql);

    params.forEach((key, value) -> {
      countQuery.setParameter(key, value);
      dataQuery.setParameter(key, value);
    });

    dataQuery.setFirstResult(startRow);
    dataQuery.setMaxResults(endRow - startRow);

    final long totalCount = ((Number) countQuery.getSingleResult()).longValue();
    final List<Object[]> rows = dataQuery.getResultList();

    final List<CardTableRow> tableRows = rows.stream()
        .map(row -> CardTableRow.builder()
            .id((String) row[0])
            .label((String) row[1])
            .reviewCount(((Number) row[2]).intValue())
            .state((String) row[3])
            .sourcePageNumber(((Number) row[4]).intValue())
            .lastReviewGrade(row[5] != null ? ((Number) row[5]).intValue() : null)
            .lastReviewDate(row[6] != null ? ((Timestamp) row[6]).toLocalDateTime() : null)
            .lastReviewPerson(row[7] != null ? (String) row[7] : null)
            .build())
        .toList();

    return CardTableResponse.builder()
        .rows(tableRows)
        .totalCount(totalCount)
        .build();
  }

  private boolean isMissingAudio(Card card) {
    final var strategy = cardTypeStrategyFactory.getStrategy(card);
    return strategy.isMissingAudio(card);
  }
}

package io.github.mucsi96.learnlanguage.repository.specification;

public class ReviewScoreSql {

    private ReviewScoreSql() {
    }

    public static final String REVIEW_SCORE_EXPRESSION = """
        (SELECT CASE
          WHEN stats.cnt = 0 THEN NULL
          WHEN stats.cnt = 1 THEN CASE WHEN stats.last_rating >= 3 THEN 100.0 ELSE 0.0 END
          ELSE (CASE WHEN stats.last_rating >= 3 THEN 50.0 ELSE 0.0 END +
                50.0 * (stats.success_count - CASE WHEN stats.last_rating >= 3 THEN 1 ELSE 0 END) / (stats.cnt - 1))
        END
        FROM (
          SELECT
            COUNT(*) as cnt,
            COUNT(*) FILTER (WHERE r.rating >= 3) as success_count,
            (SELECT r2.rating FROM learn_language.review_logs r2 WHERE r2.card_id = ?1 ORDER BY r2.review DESC LIMIT 1) as last_rating
          FROM learn_language.review_logs r
          WHERE r.card_id = ?1
        ) stats)
        """;
}

package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.UnhealthyCardResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.hibernate.Session;

import java.util.List;

@RequiredArgsConstructor
public class CardRepositoryCustomImpl implements CardRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public void updateReadinessByIds(List<String> ids, CardReadiness readiness) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<Card> update = cb.createCriteriaUpdate(Card.class);
        final Root<Card> root = update.from(Card.class);

        update.set(root.get(Card_.readiness), readiness);
        update.where(root.get(Card_.id).in(ids));

        entityManager.createQuery(update).executeUpdate();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<UnhealthyCardResponse> findUnhealthyCards() {
        final Session session = entityManager.unwrap(Session.class);

        final List<Object[]> results = session
                .createNativeQuery(
                        "SELECT {c.*}, {s.*}, ARRAY_TO_STRING(c.missing_fields, ', ') AS missing_fields " +
                        "FROM learn_language.unhealthy_cards c " +
                        "JOIN learn_language.sources s ON c.source_id = s.id " +
                        "ORDER BY c.due ASC",
                        Object[].class)
                .addEntity("c", Card.class)
                .addJoin("s", "c.source")
                .addScalar("missing_fields", String.class)
                .getResultList();

        return results.stream()
                .map(row -> UnhealthyCardResponse.from((Card) row[0], (String) row[2]))
                .toList();
    }
}

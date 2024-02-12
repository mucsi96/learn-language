package io.github.mucsi96.learnlanguage.decks;

import org.springframework.data.jpa.repository.JpaRepository;

import io.github.mucsi96.learnlanguage.model.anki.Decks;

public interface DeckRepository extends JpaRepository<Decks, Long> {
    
}

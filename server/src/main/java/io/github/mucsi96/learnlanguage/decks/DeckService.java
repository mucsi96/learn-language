package io.github.mucsi96.learnlanguage.decks;

import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.anki.Decks;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeckService {
    private final DeckRepository deckRepository;

    List<Decks> listDecks() {
        return deckRepository.findAll();
    }
}

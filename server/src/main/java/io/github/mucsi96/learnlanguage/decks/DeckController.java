package io.github.mucsi96.learnlanguage.decks;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.anki.Decks;
import lombok.RequiredArgsConstructor;


@RestController
@RequiredArgsConstructor
public class DeckController {
    private final DeckService decksService;

    @GetMapping("/decks")
    public List<Decks> listDecks() {
        return decksService.listDecks();
    }
    
}

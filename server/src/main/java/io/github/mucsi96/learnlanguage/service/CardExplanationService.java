package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.ChatMessage;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class CardExplanationService {

    private final CardService cardService;
    private final ChatService chatService;
    private final JsonMapper jsonMapper;

    public String explain(String cardId, List<ChatMessage> messages, ChatModel model) {
        final Card card = cardService.getCardById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        final String systemPrompt = buildSystemPrompt(card);
        final List<Message> history = messages.stream()
                .map(this::toMessage)
                .toList();

        return chatService.callForTextWithHistory(model, OperationType.EXPLANATION, systemPrompt, history);
    }

    private Message toMessage(ChatMessage message) {
        return "assistant".equals(message.getRole())
                ? new AssistantMessage(message.getContent())
                : new UserMessage(message.getContent());
    }

    private String buildSystemPrompt(Card card) {
        final String cardContext = jsonMapper.writeValueAsString(card.getData());

        return """
                You are a German language teacher assisting a Hungarian learner who is studying a flashcard.
                MINDIG magyarul válaszolj, függetlenül attól, hogy a kérdés milyen nyelven érkezik.
                Soha ne utasítsd vissza a kérdést; mindig adj segítőkész, türelmes magyarázatot.
                Magyarázd el a nyelvtani szabályokat, a szavak nemét, az igeragozást, és azt, hogy az \
                példamondatok miért úgy épülnek fel, ahogy.
                MINDEN német szót vagy kifejezést (beleértve a névelőket is) tegyél dupla csillagok közé, \
                például: **der Zug**, **abfahren**. A magyar szövegrészeket soha ne tedd csillagok közé.

                A tanulandó kártya adatai (JSON):
                %s
                """.formatted(cardContext);
    }
}

package io.github.mucsi96.learnlanguage.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.AiLanguage;
import io.github.mucsi96.learnlanguage.model.AnswerCheckResponse;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AnswerCheckService {

    private final CardService cardService;
    private final ChatService chatService;
    private final ChatModelSettingService chatModelSettingService;

    record AnswerCheckResult(boolean correct, String explanation) {
    }

    public AnswerCheckResponse checkAnswer(String cardId, String answer, ChatModel model) {
        final Card card = cardService.getCardById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        if (!Boolean.TRUE.equals(card.getSource().getTypingPractice())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Typing practice is not enabled for source: " + card.getSource().getId());
        }

        if (isMissing(card.getData().getFrontText()) || isMissing(card.getData().getBackText())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Card has no front/back text to check the answer against: " + cardId);
        }

        if (!chatModelSettingService.getEnabledModelsForOperation(OperationType.ANSWER_CHECK)
                .contains(model.getModelName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Model is not enabled for answer checking: " + model.getModelName());
        }

        final String systemPrompt = buildSystemPrompt(card);
        final AnswerCheckResult result = chatService.callWithLogging(
                model,
                OperationType.ANSWER_CHECK,
                systemPrompt,
                "The learner's answer: %s".formatted(answer),
                AnswerCheckResult.class);

        return AnswerCheckResponse.builder()
                .correct(result.correct())
                .explanation(result.explanation())
                .build();
    }

    private static boolean isMissing(String text) {
        return text == null || text.isBlank();
    }

    private String buildSystemPrompt(Card card) {
        final String explanationLanguage = card.getSource().getAiLanguage() == AiLanguage.ENGLISH
                ? "English"
                : "Hungarian";

        return """
                You are a patient teacher checking a learner's typed answer to a flashcard.
                Decide whether the learner's answer conveys the same meaning as the expected answer \
                on the back of the card. Minor differences in wording, spelling or phrasing are \
                acceptable as long as the meaning matches.
                When the answer is correct, set correct to true and leave the explanation empty.
                When the answer is not correct, set correct to false and briefly explain what is \
                wrong: describe what the learner's answer would mean or do, compared to what the \
                expected answer on this card means or does.
                ALWAYS write the explanation in %s, no matter which language the answer arrives in.

                The question on the front of the card:
                %s

                The expected answer on the back of the card:
                %s
                """.formatted(explanationLanguage, card.getData().getFrontText(), card.getData().getBackText());
    }
}

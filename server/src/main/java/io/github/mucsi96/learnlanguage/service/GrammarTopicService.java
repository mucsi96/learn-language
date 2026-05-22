package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.GrammarTopic;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.GrammarTopicRequest;
import io.github.mucsi96.learnlanguage.model.GrammarTopicResponse;
import io.github.mucsi96.learnlanguage.repository.GrammarTopicRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GrammarTopicService {

    private final GrammarTopicRepository grammarTopicRepository;

    public List<GrammarTopicResponse> getAllGrammarTopics() {
        return grammarTopicRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(this::toResponse)
                .toList();
    }

    public GrammarTopicResponse createGrammarTopic(GrammarTopicRequest request) {
        final String name = request.getName().trim();
        final GrammarTopic topic = GrammarTopic.builder()
                .name(name)
                .build();

        return toResponse(grammarTopicRepository.save(topic));
    }

    public GrammarTopicResponse updateGrammarTopic(Integer id, GrammarTopicRequest request) {
        final GrammarTopic topic = grammarTopicRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Grammar topic not found: " + id));

        topic.setName(request.getName().trim());

        return toResponse(grammarTopicRepository.save(topic));
    }

    public void deleteGrammarTopic(Integer id) {
        grammarTopicRepository.deleteById(id);
    }

    private GrammarTopicResponse toResponse(GrammarTopic topic) {
        return GrammarTopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .build();
    }
}

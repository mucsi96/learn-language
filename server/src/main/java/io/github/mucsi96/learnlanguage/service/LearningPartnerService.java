package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.model.LearningPartnerRequest;
import io.github.mucsi96.learnlanguage.model.LearningPartnerResponse;
import io.github.mucsi96.learnlanguage.repository.LearningPartnerRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LearningPartnerService {

    private final LearningPartnerRepository learningPartnerRepository;

    public List<LearningPartnerResponse> getAllLearningPartners() {
        return learningPartnerRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public LearningPartnerResponse createLearningPartner(LearningPartnerRequest request) {
        final LearningPartner partner = LearningPartner.builder()
                .name(request.getName())
                .build();

        return toResponse(learningPartnerRepository.save(partner));
    }

    public LearningPartnerResponse updateLearningPartner(Integer id, LearningPartnerRequest request) {
        final LearningPartner partner = learningPartnerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Learning partner not found: " + id));

        partner.setName(request.getName());

        return toResponse(learningPartnerRepository.save(partner));
    }

    public void deleteLearningPartner(Integer id) {
        learningPartnerRepository.deleteById(id);
    }

    public LearningPartner getLearningPartnerById(Integer id) {
        return learningPartnerRepository.findById(id).orElse(null);
    }

    private LearningPartnerResponse toResponse(LearningPartner partner) {
        return LearningPartnerResponse.builder()
                .id(partner.getId())
                .name(partner.getName())
                .build();
    }
}

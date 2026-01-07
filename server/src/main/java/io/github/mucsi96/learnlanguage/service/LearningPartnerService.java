package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public Optional<LearningPartner> getActivePartner() {
        return learningPartnerRepository.findByIsActiveTrue();
    }

    public LearningPartnerResponse createLearningPartner(LearningPartnerRequest request) {
        LearningPartner partner = LearningPartner.builder()
                .name(request.getName())
                .isActive(false)
                .build();

        return toResponse(learningPartnerRepository.save(partner));
    }

    @Transactional
    public LearningPartnerResponse updateLearningPartner(Integer id, LearningPartnerRequest request) {
        LearningPartner partner = learningPartnerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Learning partner not found: " + id));

        partner.setName(request.getName());

        if (request.getIsActive() != null && request.getIsActive()) {
            learningPartnerRepository.findAll().forEach(p -> {
                if (!p.getId().equals(id)) {
                    p.setIsActive(false);
                    learningPartnerRepository.save(p);
                }
            });
            partner.setIsActive(true);
        } else if (request.getIsActive() != null) {
            partner.setIsActive(false);
        }

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
                .isActive(partner.getIsActive())
                .build();
    }
}

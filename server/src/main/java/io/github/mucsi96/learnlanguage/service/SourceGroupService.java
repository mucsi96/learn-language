package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.SourceGroup;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.SourceGroupRequest;
import io.github.mucsi96.learnlanguage.model.SourceGroupResponse;
import io.github.mucsi96.learnlanguage.repository.SourceGroupRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SourceGroupService {

    private final SourceGroupRepository sourceGroupRepository;

    public List<SourceGroupResponse> getAllSourceGroups() {
        return sourceGroupRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public SourceGroupResponse createSourceGroup(SourceGroupRequest request) {
        if (sourceGroupRepository.existsById(request.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Source group already exists: " + request.getId());
        }

        final SourceGroup group = SourceGroup.builder()
                .id(request.getId())
                .name(request.getName())
                .build();

        return toResponse(sourceGroupRepository.save(group));
    }

    public SourceGroupResponse updateSourceGroup(String id, SourceGroupRequest request) {
        final SourceGroup group = sourceGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source group not found: " + id));

        group.setName(request.getName());

        return toResponse(sourceGroupRepository.save(group));
    }

    public void deleteSourceGroup(String id) {
        sourceGroupRepository.deleteById(id);
    }

    public SourceGroup getSourceGroupById(String id) {
        return sourceGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Source group not found: " + id));
    }

    private SourceGroupResponse toResponse(SourceGroup group) {
        return SourceGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .build();
    }
}

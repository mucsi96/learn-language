package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.model.PageResponse;
import org.springframework.stereotype.Service;

@Service
public class DocumentProcessorService {

    public PageResponse processDocument(String filePath, int pageNumber) {
        // Implement the logic to process the document and return the result
        // This should include extracting spans and other relevant data
        return new PageResponse();
    }
}

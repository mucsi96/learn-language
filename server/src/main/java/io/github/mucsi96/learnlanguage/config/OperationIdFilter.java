package io.github.mucsi96.learnlanguage.config;

import java.io.IOException;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

@Component
@Order(1)
public class OperationIdFilter implements Filter {

    private static final String OPERATION_ID_HEADER = "X-Operation-ID";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            if (request instanceof HttpServletRequest httpRequest) {
                final String operationId = httpRequest.getHeader(OPERATION_ID_HEADER);
                if (operationId != null && !operationId.isBlank()) {
                    OperationIdContext.set(operationId);
                }
            }
            chain.doFilter(request, response);
        } finally {
            OperationIdContext.clear();
        }
    }
}

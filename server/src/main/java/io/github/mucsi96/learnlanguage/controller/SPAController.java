package io.github.mucsi96.learnlanguage.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Controller
@RequestMapping(produces = MediaType.TEXT_HTML_VALUE)
@RequiredArgsConstructor
public class SPAController {
    private final Environment environment;

    @Value("${AZURE_TENANT_ID:}")
    private String tenantId;

    @Value("${AZURE_CLIENT_ID:}")
    private String clientId;

    @Value("${UI_CLIENT_ID:}")
    private String uiClientId;

    @GetMapping({ "/", "/{segment1:[^.]*}", "/{segment1:.+}/{segment2:[^.]*}" })
    public String index(HttpServletRequest request, Model model) {
        model.addAttribute("baseHref", request.getContextPath() + "/");
        model.addAttribute("tenantId", tenantId);
        model.addAttribute("clientId", uiClientId);
        model.addAttribute("apiClientId", clientId);
        model.addAttribute("mockAuth", environment.matchesProfiles("test"));
        return "index";
    }
}

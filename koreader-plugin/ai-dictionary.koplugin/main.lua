local Device = require("device")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local NetworkMgr = require("ui/network/manager")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local TextViewer = require("ui/widget/textviewer")
local logger = require("logger")
local _ = require("gettext")

local https = require("ssl.https")
local http = require("socket.http")
local ltn12 = require("ltn12")
local json = require("json")

local REQUEST_TIMEOUT_SECONDS = 30

https.TIMEOUT = REQUEST_TIMEOUT_SECONDS
http.TIMEOUT = REQUEST_TIMEOUT_SECONDS

local PTF_HEADER = "\u{FFF1}"
local PTF_BOLD_START = "\u{FFF2}"
local PTF_BOLD_END = "\u{FFF3}"

local AIDictionary = WidgetContainer:extend {
    name = "ai-dictionary",
    is_doc_only = true,
}

local function bold(s)
    return PTF_BOLD_START .. s .. PTF_BOLD_END
end

local function getPluginDir()
    local info = debug.getinfo(1, "S")
    return info.source:match("@?(.*/)") or "."
end

local function readFile(path)
    local file = io.open(path, "r")
    if not file then return nil end
    local content = file:read("*a")
    file:close()
    return content and content:match("^%s*(.-)%s*$")
end

local function loadConfig()
    local dir = getPluginDir()
    logger.dbg("AIDictionary: plugin dir =", dir)

    local configPath = dir .. "ai-dictionary.json"
    local configContent = readFile(configPath)
    if not configContent then
        logger.warn("AIDictionary: config not found at", configPath)
        return nil
    end

    local ok, config = pcall(json.decode, configContent)
    if not ok then
        logger.warn("AIDictionary: failed to parse config:", config)
        return nil
    end

    local tokenPath = dir .. "ai-dictionary.token"
    local token = readFile(tokenPath)
    if token then
        config.token = token
    else
        logger.warn("AIDictionary: token file not found at", tokenPath)
    end

    logger.dbg("AIDictionary: config loaded, serverUrl =", config.serverUrl)
    return config
end

local function queryDictionary(serverUrl, token, requestBody)
    local requestJson = json.encode(requestBody)
    logger.dbg("AIDictionary: POST", serverUrl .. "/dictionary")

    local responseBody = {}

    local _, code = https.request {
        url = serverUrl .. "/dictionary",
        method = "POST",
        headers = {
            ["Content-Type"] = "application/json",
            ["Content-Length"] = tostring(#requestJson),
            ["Authorization"] = "Bearer " .. token,
        },
        source = ltn12.source.string(requestJson),
        sink = ltn12.sink.table(responseBody),
    }

    local raw = table.concat(responseBody)

    if tostring(code) ~= "200" then
        logger.warn("AIDictionary: request failed, code =", code, "body =", raw)
        return nil, "HTTP " .. tostring(code) .. ": " .. raw
    end

    logger.dbg("AIDictionary: lookup succeeded")
    return json.decode(raw), nil
end

local function formatResult(result)
    local lines = {}

    local header = result.word or ""
    if result.type then
        header = header .. "  " .. bold(result.type)
    end
    if result.gender then
        header = header .. " (" .. result.gender .. ")"
    end

    lines[#lines + 1] = PTF_HEADER .. bold(header)

    if result.forms and #result.forms > 0 then
        lines[#lines + 1] = bold("Forms: ") .. table.concat(result.forms, ", ")
    end

    if result.translation then
        for lang, text in pairs(result.translation) do
            lines[#lines + 1] = bold("Translation (" .. lang .. "): ") .. text
        end
    end

    if result.examples and #result.examples > 0 then
        local ex = result.examples[1]
        if ex.de then
            lines[#lines + 1] = ""
            lines[#lines + 1] = bold("Example (de): ") .. ex.de
        end
        if ex.en then
            lines[#lines + 1] = bold("Example (en): ") .. ex.en
        end
        if ex.hu then
            lines[#lines + 1] = bold("Example (hu): ") .. ex.hu
        end
    end

    return PTF_HEADER .. table.concat(lines, "\n")
end

local function getContextAroundSelection(document, selection, window)
    window = window or 10
    local Screen = Device.screen
    local page_text = nil

    pcall(function()
        local raw = document:getTextFromPositions(
            { x = 0, y = 0 },
            { x = Screen:getWidth(), y = Screen:getHeight() },
            true
        )
        if type(raw) == "string" then
            page_text = raw
        elseif type(raw) == "table" and raw.text then
            page_text = raw.text
        end
    end)

    if not page_text or not selection or selection == "" then
        return selection or ""
    end

    local safe = selection:gsub("([%%%^%$%(%)%[%]%.%*%+%-%?])", "%%%1")
    local s_pos, e_pos = page_text:find(safe)
    if not s_pos then return selection end

    local before_text = page_text:sub(1, s_pos - 1)
    local after_text = page_text:sub(e_pos + 1)

    local before_tokens = {}
    for tok in before_text:gmatch("%S+") do
        before_tokens[#before_tokens + 1] = tok
    end
    local start = math.max(1, #before_tokens - window + 1)
    local before = table.concat(before_tokens, " ", start, #before_tokens)

    local after_tokens, count = {}, 0
    for tok in after_text:gmatch("%S+") do
        after_tokens[#after_tokens + 1] = tok
        count = count + 1
        if count >= window then break end
    end
    local after = table.concat(after_tokens, " ")

    return before .. " " .. selection .. " " .. after
end

function AIDictionary:init()
    logger.dbg("AIDictionary: init")
    if not self.ui.highlight then
        logger.dbg("AIDictionary: no highlight module, skipping")
        return
    end
    self.ui.highlight:addToHighlightDialog("13_ai_dictionary", function(this)
        return {
            text = _("AI Dictionary"),
            enabled = true,
            callback = function()
                local selected_text = tostring(this.selected_text.text)
                this:onClose()
                self:lookup(selected_text)
            end,
        }
    end)
end

function AIDictionary:lookup(highlightedText)
    local config = loadConfig()
    if not config then
        UIManager:show(InfoMessage:new {
            text = _("Config not found.\nPlace ai-dictionary.json next to the plugin."),
        })
        return
    end

    if not config.serverUrl then
        UIManager:show(InfoMessage:new {
            text = _("serverUrl is missing in ai-dictionary.json."),
        })
        return
    end

    if not config.token then
        UIManager:show(InfoMessage:new {
            text = _("Token not found.\nPlace ai-dictionary.token next to the plugin."),
        })
        return
    end

    if not NetworkMgr:isOnline() then
        UIManager:show(InfoMessage:new {
            text = _("No internet connection."),
        })
        return
    end

    logger.dbg("AIDictionary: looking up", highlightedText)

    local props = self.ui.document:getProps()
    local title = props.title or ""
    local author = props.authors or ""
    if type(author) == "table" then
        author = table.concat(author, ", ")
    end

    local sentence = getContextAroundSelection(
        self.ui.document, highlightedText, 10
    )

    local viewer = TextViewer:new {
        title = "AI Dictionary",
        text = _("Looking up..."),
    }

    UIManager:show(viewer)

    local targetLanguage = config.targetLanguage or "en"
    local serverUrl = config.serverUrl

    UIManager:scheduleIn(0.01, function()
        local result, err = queryDictionary(serverUrl, config.token, {
            bookTitle = title,
            author = author,
            targetLanguage = targetLanguage,
            sentence = sentence,
            highlightedWord = highlightedText,
        })

        UIManager:close(viewer)

        if err then
            UIManager:show(InfoMessage:new {
                text = _("Lookup failed: ") .. err,
            })
            return
        end

        UIManager:show(TextViewer:new {
            title = "AI Dictionary",
            text = formatResult(result),
        })
    end)
end

return AIDictionary

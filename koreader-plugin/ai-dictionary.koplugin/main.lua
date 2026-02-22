local Device = require("device")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local NetworkMgr = require("ui/network/manager")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local TextViewer = require("ui/widget/textviewer")
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

    local configPath = dir .. "ai-dictionary.json"
    local configContent = readFile(configPath)
    if not configContent then
        return nil
    end

    local ok, config = pcall(json.decode, configContent)
    if not ok then
        return nil
    end

    local tokenPath = dir .. "ai-dictionary.token"
    local token = readFile(tokenPath)
    if token then
        local cleaned = token:gsub("\xEF\xBB\xBF", ""):gsub("%s+", "")
        config.token = cleaned
    end

    return config
end

local function queryDictionary(serverUrl, token, requestBody)
    local requestJson = json.encode(requestBody)

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
        return nil, "HTTP " .. tostring(code) .. ": " .. raw
    end

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

local function getSentenceAroundSelection(document, selection)
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
    local s_pos = page_text:find(safe)
    if not s_pos then return selection end

    local sentence_start = (page_text:sub(1, s_pos - 1):match(".*[%.%!%?]()") or 1)
    local sentence_end = page_text:find("[%.%!%?]", s_pos)
    sentence_end = sentence_end or #page_text

    return page_text:sub(sentence_start, sentence_end):match("^%s*(.-)%s*$")
end

function AIDictionary:init()
    if not self.ui.highlight then
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

    local props = self.ui.document:getProps()
    local title = props.title or ""
    local author = props.authors or ""
    if type(author) == "table" then
        author = table.concat(author, ", ")
    end

    local sentence = getSentenceAroundSelection(
        self.ui.document, highlightedText
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

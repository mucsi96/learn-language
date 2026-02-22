local Device = require("device")
local InputContainer = require("ui/widget/container/inputcontainer")
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

local AIDictionary = InputContainer:new {
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

local function readTokenFile()
    local path = getPluginDir() .. "ai-dictionary.token"
    local file = io.open(path, "r")
    if not file then return nil end
    local token = file:read("*a")
    file:close()
    return token and token:match("^%s*(.-)%s*$")
end

local function readServerUrl()
    local path = getPluginDir() .. "ai-dictionary.url"
    local file = io.open(path, "r")
    if not file then return nil end
    local url = file:read("*a")
    file:close()
    return url and url:match("^%s*(.-)%s*$")
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
    self.ui.highlight:addToHighlightDialog("ai_dictionary_lookup", function(_reader_highlight_instance)
        return {
            text = _("AI Dictionary"),
            enabled = Device:hasClipboard(),
            callback = function()
                self:lookup(_reader_highlight_instance, "en")
            end,
        }
    end)

    self.ui.highlight:addToHighlightDialog("ai_dictionary_lookup_hu", function(_reader_highlight_instance)
        return {
            text = _("AI Dictionary (HU)"),
            enabled = Device:hasClipboard(),
            callback = function()
                self:lookup(_reader_highlight_instance, "hu")
            end,
        }
    end)
end

function AIDictionary:lookup(_reader_highlight_instance, targetLanguage)
    local token = readTokenFile()
    if not token then
        UIManager:show(InfoMessage:new {
            text = _("Token file not found.\nPlace ai-dictionary.token next to the plugin."),
        })
        return
    end

    local serverUrl = readServerUrl()
    if not serverUrl then
        UIManager:show(InfoMessage:new {
            text = _("Server URL file not found.\nPlace ai-dictionary.url next to the plugin."),
        })
        return
    end

    if not NetworkMgr:isOnline() then
        UIManager:show(InfoMessage:new {
            text = _("No internet connection."),
        })
        return
    end

    local highlightedText = tostring(
        _reader_highlight_instance.selected_text.text
    )

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
        width = nil,
        height = nil,
    }

    self.ui.highlight:onClose()
    UIManager:show(viewer)

    UIManager:scheduleIn(0.01, function()
        local result, err = queryDictionary(serverUrl, token, {
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
            width = nil,
            height = nil,
        })
    end)
end

return AIDictionary

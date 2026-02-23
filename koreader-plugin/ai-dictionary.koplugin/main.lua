local Device = require("device")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local NetworkMgr = require("ui/network/manager")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local TextViewer = require("ui/widget/textviewer")

local https = require("ssl.https")
local ltn12 = require("ltn12")
local json = require("json")

local AIDictionary = WidgetContainer:extend {
    name = "ai-dictionary",
    is_doc_only = true,
}

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
        return nil, "Config not found.\nPlace ai-dictionary.json next to the plugin."
    end

    local ok, config = pcall(json.decode, configContent)
    if not ok then
        return nil, "Invalid JSON in ai-dictionary.json:\n" .. tostring(config)
    end

    local tokenPath = dir .. "ai-dictionary.token"
    local token = readFile(tokenPath)
    if token then
        local cleaned = token:gsub("\xEF\xBB\xBF", ""):gsub("%s+", "")
        config.token = cleaned
    end

    return config, nil
end

local function queryDictionary(serverUrl, token, requestBody)
    local requestJson = json.encode(requestBody)

    local responseBody = {}

    local _, code = https.request {
        url = serverUrl .. "/api/dictionary",
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

    if code ~= 200 then
        local reason = code and ("HTTP " .. code .. ": " .. raw) or "Connection failed"
        return nil, reason
    end

    return raw, nil
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
    local config, configErr = loadConfig()
    self.config = config
    self.configErr = configErr
    self.ui.highlight:addToHighlightDialog("13_ai_dictionary", function(this)
        return {
            text = "AI Dictionary",
            enabled = true,
            callback = function()
                local selected_text = tostring(this.selected_text.text)
                this:saveHighlight()
                this:onClose()
                self:lookup(selected_text)
            end,
        }
    end)
end

function AIDictionary:lookup(highlightedText)
    local config = self.config
    if not config then
        UIManager:show(InfoMessage:new {
            text = self.configErr,
        })
        return
    end

    if not config.serverUrl then
        UIManager:show(InfoMessage:new {
            text = "serverUrl is missing in ai-dictionary.json.",
        })
        return
    end

    if not config.token then
        UIManager:show(InfoMessage:new {
            text = "Token not found.\nPlace ai-dictionary.token next to the plugin.",
        })
        return
    end

    if not NetworkMgr:isOnline() then
        UIManager:show(InfoMessage:new {
            text = "No internet connection.",
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
        text = "Looking up...",
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
                text = "Lookup failed: " .. err,
            })
            return
        end

        UIManager:show(TextViewer:new {
            title = "AI Dictionary",
            text = result,
        })
    end)
end

return AIDictionary

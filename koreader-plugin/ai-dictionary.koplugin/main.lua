local Device = require("device")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local NetworkMgr = require("ui/network/manager")
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")
local TextViewer = require("ui/widget/textviewer")
local InputDialog = require("ui/widget/inputdialog")
local InputText = require("ui/widget/inputtext")
local Font = require("ui/font")
local Size = require("ui/size")

local http = require("socket.http")
local https = require("ssl.https")
local socket = require("socket")
local ltn12 = require("ltn12")
local json = require("json")
local ffi = require("ffi")
local ffiutil = require("ffi/util")

local Screen = Device.screen

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

local function applyMarkers(text)
    return text:gsub("<<H>>", "\239\191\177")
               :gsub("<<B>>", "\239\191\178")
               :gsub("<</B>>", "\239\191\179")
end

local StreamText = InputText:extend{}

function StreamText:addChars(chars)
    self.readonly = false
    InputText.addChars(self, chars)
end

function StreamText:initTextBox(text, char_added)
    self.for_measurement_only = true
    InputText.initTextBox(self, text, char_added)
    UIManager:setDirty(self.parent, function() return "fast", self.dimen end)
    self.for_measurement_only = false
end

function StreamText:onCloseWidget()
    UIManager:setDirty(self.parent, function() return "flashui", self.dimen end)
    return InputText.onCloseWidget(self)
end

local PROTOCOL_NON_200 = "X-NON-200:"

local function wrapFd(fd)
    local obj = {}
    function obj:write(chunk)
        ffiutil.writeToFD(fd, chunk)
        return self
    end
    function obj:close() return true end
    return obj
end

local function backgroundRequest(url, token, requestJson)
    return function(pid, child_write_fd)
        https.cert_verify = false
        local pipe_w = wrapFd(child_write_fd)
        local code = socket.skip(1, http.request {
            url = url,
            method = "POST",
            headers = {
                ["Content-Type"] = "application/json",
                ["Content-Length"] = tostring(#requestJson),
                ["Authorization"] = "Bearer " .. token,
                ["Accept"] = "text/event-stream",
            },
            source = ltn12.source.string(requestJson),
            sink = ltn12.sink.file(pipe_w),
        })
        if code ~= 200 then
            ffiutil.writeToFD(child_write_fd,
                string.format("\r\n%sHTTP %s\n", PROTOCOL_NON_200, tostring(code or "failed")))
        end
        ffi.C.close(child_write_fd)
    end
end

local function processStream(bgQuery, onChunk)
    local pid, parent_read_fd = ffiutil.runInSubProcess(bgQuery, true)
    if not pid then
        return nil, "Failed to start request"
    end

    local _coroutine = coroutine.running()
    local check_interval = 0.125
    local chunksize = 1024 * 16
    local buffer = ffi.new('char[?]', chunksize, {0})
    local buffer_ptr = ffi.cast('void*', buffer)
    local partial_data = ""
    local result_parts = {}
    local completed = false
    local non200 = false

    while not completed do
        UIManager:scheduleIn(check_interval, function()
            coroutine.resume(_coroutine)
        end)
        coroutine.yield()

        local readsize = ffiutil.getNonBlockingReadSize(parent_read_fd)
        if readsize > 0 then
            local bytes_read = tonumber(ffi.C.read(parent_read_fd, buffer_ptr, chunksize))
            if bytes_read <= 0 then break end

            partial_data = partial_data .. ffi.string(buffer, bytes_read)

            while true do
                local line_end = partial_data:find("[\r\n]")
                if not line_end then break end

                local line = partial_data:sub(1, line_end - 1)
                partial_data = partial_data:sub(line_end + 1)

                if line:sub(1, 5) == "data:" then
                    local data = line:sub(6)
                    table.insert(result_parts, data)
                    onChunk(data)
                elseif line:sub(1, #PROTOCOL_NON_200) == PROTOCOL_NON_200 then
                    non200 = true
                    table.insert(result_parts, line:sub(#PROTOCOL_NON_200 + 1))
                    completed = true
                    break
                end
            end
        elseif readsize == 0 then
            completed = ffiutil.isSubProcessDone(pid)
        end
    end

    ffiutil.terminateSubProcess(pid)

    local function collectAndClean()
        if ffiutil.isSubProcessDone(pid) then
            if parent_read_fd then ffiutil.readAllFromFD(parent_read_fd) end
        else
            if parent_read_fd and ffiutil.getNonBlockingReadSize(parent_read_fd) ~= 0 then
                ffiutil.readAllFromFD(parent_read_fd)
                parent_read_fd = nil
            end
            UIManager:scheduleIn(5, collectAndClean)
        end
    end
    UIManager:scheduleIn(5, collectAndClean)

    local result = table.concat(result_parts)
    if non200 then return nil, "HTTP error: " .. result end
    if #result == 0 then return nil, "No response received" end
    return applyMarkers(result), nil
end

local function getSentenceAroundSelection(document, selection)
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

    local targetLanguage = config.targetLanguage or "en"
    local serverUrl = config.serverUrl

    local requestJson = json.encode({
        bookTitle = title,
        author = author,
        targetLanguage = targetLanguage,
        sentence = sentence,
        highlightedWord = highlightedText,
    })

    local streamDialog = InputDialog:new {
        title = "AI Dictionary",
        inputtext_class = StreamText,
        input_face = Font:getFace("infofont", 20),
        width = Screen:getWidth() - 2 * Size.margin.default,
        use_available_height = true,
        readonly = true,
        fullscreen = false,
        allow_newline = true,
        add_nav_bar = false,
        cursor_at_end = true,
        add_scroll_buttons = true,
        condensed = true,
        scroll_by_pan = true,
        buttons = {{
            {
                text = "Close",
                id = "close",
                callback = function()
                    UIManager:close(streamDialog)
                end,
            },
        }},
    }

    streamDialog._input_widget:setText("Looking up...", true)
    UIManager:show(streamDialog)

    local bgQuery = backgroundRequest(
        serverUrl .. "/api/dictionary", config.token, requestJson
    )

    local co = coroutine.create(function()
        local first_content = true
        local result, err = processStream(bgQuery, function(chunk)
            UIManager:nextTick(function()
                if first_content then
                    streamDialog._input_widget:setText("", true)
                    first_content = false
                end
                streamDialog:addTextToInput(chunk)
            end)
        end)

        UIManager:close(streamDialog)

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

    coroutine.resume(co)
end

return AIDictionary

local startTime = os.time()
local healthToken = GetConvar('HEALTH_CHECK_TOKEN', 'default_token')

-- Allowlisted RPC commands
local allowedCommands = {
    'say',
    'status',
    'heartbeat'
}

-- Health endpoint
RegisterCommand('health', function(source, args, rawCommand)
    if source == 0 then -- Console command
        local players = GetNumPlayerIndices()
        local uptime = (os.time() - startTime) * 1000

        local response = {
            ok = true,
            players = players,
            uptime_ms = uptime,
            timestamp = os.time()
        }

        print(json.encode(response))
    end
end, true)

-- HTTP health endpoint
local function createHealthEndpoint()
    SetHttpHandler(function(request, response)
        local path = request.path

        if path == '/health' then
            local players = GetNumPlayerIndices()
            local uptime = (os.time() - startTime) * 1000

            local healthData = {
                ok = true,
                players = players,
                uptime_ms = uptime,
                timestamp = os.time()
            }

            response.writeHead(200, {
                ['Content-Type'] = 'application/json',
                ['Access-Control-Allow-Origin'] = '*'
            })
            response.send(json.encode(healthData))

        elseif path == '/rpc' and request.method == 'POST' then
            -- Parse JSON body
            local body = request.setDataHandler and request.body or ''
            local success, data = pcall(json.decode, body)

            if not success or not data or not data.command then
                response.writeHead(400, {['Content-Type'] = 'application/json'})
                response.send(json.encode({error = 'Invalid JSON or missing command'}))
                return
            end

            -- Check if command is allowlisted
            local command = data.command
            local isAllowed = false
            for _, allowedCmd in ipairs(allowedCommands) do
                if command == allowedCmd then
                    isAllowed = true
                    break
                end
            end

            if not isAllowed then
                response.writeHead(403, {['Content-Type'] = 'application/json'})
                response.send(json.encode({error = 'Command not allowlisted'}))
                return
            end

            -- Execute command based on type
            local result = {}

            if command == 'say' then
                local message = data.message or 'Hello from AI system'
                TriggerClientEvent('chat:addMessage', -1, {
                    color = {255, 0, 0},
                    multiline = true,
                    args = {'[AI]', message}
                })
                result = {success = true, message = 'Message sent'}

            elseif command == 'status' then
                result = {
                    success = true,
                    players = GetNumPlayerIndices(),
                    uptime_ms = (os.time() - startTime) * 1000,
                    resources = GetNumResources()
                }

            elseif command == 'heartbeat' then
                result = {
                    success = true,
                    heartbeat = 'alive',
                    timestamp = os.time()
                }
            end

            response.writeHead(200, {
                ['Content-Type'] = 'application/json',
                ['Access-Control-Allow-Origin'] = '*'
            })
            response.send(json.encode(result))

        else
            response.writeHead(404, {['Content-Type'] = 'application/json'})
            response.send(json.encode({error = 'Not found'}))
        end
    end)
end

-- Initialize when resource starts
AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        print('[AI Health] Resource started')
        print('[AI Health] Health endpoint available at /health')
        print('[AI Health] RPC endpoint available at /rpc')
        createHealthEndpoint()
    end
end)

-- Server heartbeat for monitoring
CreateThread(function()
    while true do
        Wait(60000) -- Every minute
        print(string.format('[AI Health] Heartbeat - Players: %d, Uptime: %d minutes',
            GetNumPlayerIndices(),
            math.floor((os.time() - startTime) / 60)
        ))
    end
end)
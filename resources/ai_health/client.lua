-- Client-side health monitoring
local isReady = false

-- Mark client as ready when spawned
AddEventHandler('playerSpawned', function()
    isReady = true
    print('[AI Health Client] Player spawned and ready')
end)

-- Health check from server
RegisterNetEvent('ai_health:clientCheck')
AddEventHandler('ai_health:clientCheck', function()
    TriggerServerEvent('ai_health:clientResponse', {
        ready = isReady,
        coords = GetEntityCoords(PlayerPedId()),
        health = GetEntityHealth(PlayerPedId())
    })
end)

-- Periodic client heartbeat
CreateThread(function()
    while true do
        Wait(300000) -- Every 5 minutes
        if isReady then
            print('[AI Health Client] Client heartbeat - Ready and active')
        end
    end
end)
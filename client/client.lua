local UIOpen = false
ESX = exports['es_extended']:getSharedObject()

function OpenBankUI()
    if UIOpen then return end
    
    ESX.TriggerServerCallback('esx_atm_pin:getAccountData', function(accountData)
        if accountData then
            SetNuiFocus(true, true)
            UIOpen = true
            SendNUIMessage({
                action = 'open',
                data = {
                    accountData = accountData,
                    config = Config,
                    locale = Locale
                }
            })
        end
    end)
end

function CloseBankUI()
    if not UIOpen then return end
    SetNuiFocus(false, false)
    UIOpen = false
    SendNUIMessage({ action = 'close' })
end

-- RegisterCommand('openbank', function() OpenBankUI() end, false)

RegisterNUICallback('close', function(data, cb) CloseBankUI(); cb('ok') end)
RegisterNUICallback('setPin', function(data, cb) TriggerServerEvent('esx_atm_pin:setPin', data.pin); cb('ok') end)

RegisterNUICallback('getTransactionHistory', function(data, cb)
    ESX.TriggerServerCallback('esx_atm_pin:getTransactionHistory', function(history)
        SendNUIMessage({ action = 'updateTransactions', data = history })
    end)
    cb('ok')
end)

local function handleTransaction(type, data, cb)
    local id = type == 'transfer' and tonumber(data.targetId) or nil
    local amount = tonumber(data.amount)

    if (type == 'transfer' and not id) or not amount or amount <= 0 then
        SendNUIMessage({ action = 'transactionFail', data = { message = Locale['notify_transfer_invalid'] }})
        return cb('error')
    end

    ESX.TriggerServerCallback(('esx_atm_pin:%s'):format(type), function(result)
        if result and result.success then
            SendNUIMessage({ action = 'transactionSuccess', data = { newBalance = result.newBalance, message = result.message } })
        elseif result and not result.success then
            SendNUIMessage({ action = 'transactionFail', data = { message = result.message } })
        end
    end, (type == 'transfer' and id or amount), (type == 'transfer' and amount or nil))
    cb('ok')
end

RegisterNUICallback('deposit', function(data, cb) handleTransaction('deposit', data, cb) end)
RegisterNUICallback('withdraw', function(data, cb) handleTransaction('withdraw', data, cb) end)
RegisterNUICallback('transfer', function(data, cb) handleTransaction('transfer', data, cb) end)

local banklist = {
    { nama = 'Bank', coords = vector3(149.07, -1041.16, 29.54), heading = 160, id = 108, color = 2 },
    { nama = 'Bank', coords = vector3(-1212.98, -331.53, 38.24), heading = 206, id = 108, color = 2 },
    { nama = 'Bank', coords = vector3(-2962.16, 482.17, 15.7), heading = 269, id = 108, color = 2 },
    { nama = 'Bank', coords = vector3(-112.29, 6469.38, 31.63), heading = 316, id = 108, color = 2 },
    { nama = 'Bank', coords = vector3(313.56, -279.7, 54.8), heading = 160, id = 108, color = 2 },
    { nama = 'Bank', coords = vector3(-351.51, -49.8, 49.04), heading = 160, id = 108, color = 2 },
    { nama = 'Bank', coords = vector3(1175.92, 2707.86, 38.09), heading = 359.73, id = 108, color = 2 },
    { nama = 'Bank Besar', coords = vector3(242.41, 225.03, 106.29), heading = 342.44, id = 106, color = 2 },
}


CreateThread(function()
	for k,v in ipairs(banklist) do
        exports.ox_target:addBoxZone({
            name    = 'bankZone' .. k,
            coords  = v.coords,
            size    = vec3(4.5, 1.5, 4.0),
            rotation= v.heading,
            options = {
                {
                    name    = 'accessBank',
                    label   = 'Akses Bank',
                    icon    = 'fas fa-piggy-bank',
                    distance= 2.5,
                    onSelect = function()
                        OpenBankUI()
                    end,
                }
            }
        })
	end

    local atmlist = {
        `prop_atm_01`,
        `prop_atm_02`,
        `prop_atm_03`,
        `prop_fleeca_atm`,
    }
    exports.ox_target:addModel(atmlist, {
        {
            name    = 'accessATM',
            label   = 'Akses ATM',
            icon    = 'fas fa-money-check',
            distance= 1.5,
            onSelect = function()
                OpenBankUI()
            end
        },
    })
end)

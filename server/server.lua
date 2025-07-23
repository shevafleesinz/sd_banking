ESX = exports['es_extended']:getSharedObject()

local useOxMySQL = GetResourceState('oxmysql') == 'started'
local function asyncQuery(query, params, cb)
    if useOxMySQL then exports.oxmysql:query(query, params, cb)
    else MySQL.Async.fetchAll(query, params, cb) end
end
local function asyncUpdate(query, params, cb)
    if useOxMySQL then exports.oxmysql:update(query, params, cb)
    else MySQL.Async.execute(query, params, cb) end
end

local function logTransaction(identifier, transType, amount, description)
    asyncUpdate('INSERT INTO bank_transactions (identifier, type, amount, description) VALUES (?, ?, ?, ?)', { identifier, transType, amount, description or 'Transaksi Bank' })
end

ESX.RegisterServerCallback('esx_atm_pin:getTransactionHistory', function(source, cb)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer then return cb({}) end
    asyncQuery('SELECT `type`, `amount`, `date`, `description` FROM `bank_transactions` WHERE identifier = ? ORDER BY `date` DESC LIMIT 50', { xPlayer.identifier }, function(result) cb(result or {}) end)
end)

ESX.RegisterServerCallback('esx_atm_pin:getAccountData', function(source, cb)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer then return cb(nil) end
    asyncQuery('SELECT pin, firstname, lastname FROM users WHERE identifier = ?', { xPlayer.identifier }, function(result)
        if not result or not result[1] then return cb(nil) end
        local row = result[1]
        cb({ hasPin = (row.pin ~= nil and row.pin ~= ''), pin = row.pin, bank = xPlayer.getAccount('bank').money, playerName = ('%s %s'):format(row.firstname, row.lastname), accountNumber = xPlayer.identifier })
    end)
end)

RegisterNetEvent('esx_atm_pin:setPin', function(newPin)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or not newPin or #newPin ~= 4 then return end
    asyncUpdate('UPDATE users SET pin = ? WHERE identifier = ?', { newPin, xPlayer.identifier })
end)

ESX.RegisterServerCallback('esx_atm_pin:deposit', function(source, cb, amount)
    local xPlayer = ESX.GetPlayerFromId(source)
    amount = tonumber(amount)
    if xPlayer.getMoney() >= amount then
        xPlayer.removeMoney(amount)
        xPlayer.addAccountMoney('bank', amount)
        logTransaction(xPlayer.identifier, 'deposit', amount, 'Setor tunai')
        cb({ success = true, newBalance = xPlayer.getAccount('bank').money, message = ('Berhasil menyetor $%s'):format(ESX.Math.GroupDigits(amount)) })
    else
        cb({ success = false, message = 'Uang tunai tidak mencukupi.' })
    end
end)

ESX.RegisterServerCallback('esx_atm_pin:withdraw', function(source, cb, amount)
    local xPlayer = ESX.GetPlayerFromId(source)
    amount = tonumber(amount)
    if xPlayer.getAccount('bank').money >= amount then
        xPlayer.removeAccountMoney('bank', amount)
        xPlayer.addMoney(amount)
        logTransaction(xPlayer.identifier, 'withdraw', amount, 'Tarik tunai')
        cb({ success = true, newBalance = xPlayer.getAccount('bank').money, message = ('Berhasil menarik $%s'):format(ESX.Math.GroupDigits(amount)) })
    else
        cb({ success = false, message = 'Saldo bank tidak mencukupi.' })
    end
end)

ESX.RegisterServerCallback('esx_atm_pin:transfer', function(source, cb, targetId, amount)
    local xPlayer = ESX.GetPlayerFromId(source)
    local xTarget = ESX.GetPlayerFromId(tonumber(targetId))
    amount = tonumber(amount)

    if source == tonumber(targetId) then return cb({ success = false, message = 'Anda tidak bisa mentransfer ke diri sendiri.' }) end
    if not xTarget then return cb({ success = false, message = 'Pemain target tidak online.' }) end

    if xPlayer.getAccount('bank').money >= amount then
        xPlayer.removeAccountMoney('bank', amount)
        xTarget.addAccountMoney('bank', amount)
        
        logTransaction(xPlayer.identifier, 'withdraw', amount, ('Transfer ke %s'):format(xTarget.getName()))
        logTransaction(xTarget.identifier, 'deposit', amount, ('Transfer dari %s'):format(xPlayer.getName()))

        xTarget.showNotification(('Anda menerima $%s dari %s'):format(ESX.Math.GroupDigits(amount), xPlayer.getName()))
        cb({ success = true, newBalance = xPlayer.getAccount('bank').money, message = ('Berhasil transfer $%s ke %s'):format(ESX.Math.GroupDigits(amount), xTarget.getName()) })
    else
        cb({ success = false, message = 'Saldo bank tidak mencukupi.' })
    end
end)
fx_version 'cerulean'
game 'gta5'
lua54 'yes'

shared_scripts {
    '@es_extended/imports.lua',
    '@ox_lib/init.lua',
    'config.lua',
    'locales/en.lua',
}

ui_page 'html/index.html'


client_script 'client/*.lua'

server_script 'server/*.lua'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}

escrow_ignore {
    'config.lua',
    'locales/en.lua',
}
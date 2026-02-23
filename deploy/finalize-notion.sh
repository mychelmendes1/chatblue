#!/usr/bin/expect -f
set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"
set local_dir [pwd]

# Enviar o NotionService atualizado
spawn scp -o StrictHostKeyChecking=no \
  "$local_dir/apps/api/src/services/notion/notion.service.ts" \
  ${user}@${server}:/opt/chatblue/app/apps/api/src/services/notion/notion.service.ts

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}
expect eof

# Recompilar e recarregar
spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "
send "cd /opt/chatblue/app && pnpm build --filter api\r"
expect -timeout 60 "# "
send "pm2 reload deploy/ecosystem.config.js --update-env\r"
expect -timeout 30 "# "
send "echo '=== NotionService atualizado e PM2 recarregado ==='\r"
expect "# "
send "exit\r"
expect eof

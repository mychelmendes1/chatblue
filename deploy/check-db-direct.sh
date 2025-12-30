#!/usr/bin/expect -f

set timeout 120
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send "cd /opt/chatblue/app\r"
expect "# "

send "echo '=== Buscando DATABASE_URL ==='\r"
expect "# "
send "grep DATABASE_URL apps/api/.env | head -1\r"
expect "# "

send "echo '=== Listando conexões via Prisma Query ==='\r"
expect "# "
send "cd apps/api && node -e \"const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.whatsAppConnection.findMany().then(c => { console.log(JSON.stringify(c.map(x => ({id: x.id, name: x.name, type: x.type, status: x.status})), null, 2)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });\"\r"
expect "# "

send "exit\r"
expect eof


#!/usr/bin/expect -f
set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" { send "${password}\r" }
    "yes/no"   { send "yes\r"; expect "password:"; send "${password}\r" }
}

expect "# "

# Check recent logs for the Tokeniza connection - look for stability
send {pm2 logs chatblue-api --nostream --lines 100 2>&1 | grep -E 'cmluuhmvv000hr7vridzr0diy' | tail -15}
send "\r"
expect -timeout 15 "# "

# Check ALL Baileys connections status
send {docker exec chatblue_postgres psql -U chatblue chatblue -c "SELECT wc.id, wc.name, c.name AS company, wc.status, wc.is_active FROM whatsapp_connections wc JOIN companies c ON wc.company_id = c.id WHERE wc.type = 'BAILEYS' AND wc.status IN ('CONNECTED', 'CONNECTING') ORDER BY c.name;"}
send "\r"
expect "# "

# Check for any 428/440 errors since restart
send {pm2 logs chatblue-api --nostream --lines 100 2>&1 | grep -iE '428|440|conflict|terminated|keeping session' | tail -10}
send "\r"
expect -timeout 15 "# "

send "exit\r"
expect eof

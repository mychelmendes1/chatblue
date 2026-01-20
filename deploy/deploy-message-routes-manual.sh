#!/usr/bin/expect -f

set timeout 180
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}

expect {
    "password:" {
        send "${password}\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${password}\r"
    }
}

expect "# "

# Create the updated message.routes.ts file
send "cat > /opt/chatblue/app/apps/api/src/routes/message.routes.tmp.ts << 'ENDOFFILE'\r"
expect ">"











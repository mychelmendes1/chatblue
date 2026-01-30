#!/usr/bin/expect -f

set timeout 60
set server "84.247.191.105"
set user "root"
set password "fjykwePMThmj6nav"

spawn ssh -o StrictHostKeyChecking=no ${user}@${server}
expect "password:" { send "${password}\r" }

expect "# "
send {curl -s "https://graph.facebook.com/v21.0/1318372846504269/message_templates?status=APPROVED" -H "Authorization: Bearer EAAduysxe6nMBOZCkmloplb67YlETGBglp1PdsjVT6TV7AEzBZBid3x4fK1udNVoKOjo4Q3mZBegVRGp9tE9TiyyL4ftkzY27iADv4CZA1PQfiZBQMQMc8HRyC7CELo66Q3vXqCMkYsNzWENTGZAfOTWp6TdqY5FfLYlWiEmALmilGpJHzqQwnCj8PkWpIv0aqnvAZDZD" | python3 -m json.tool 2>/dev/null | head -100}
send "\r"
expect "# "

send "exit\r"
expect eof













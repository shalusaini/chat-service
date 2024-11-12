# chat-service
 A chat service project in Node.js enables real-time messaging using Socket.io for instant communication between users. It supports private and group chats, with MongoDB for storing chat history and user data.
 
## send message (one to one)
Use api to send message, after executing business logic api will dispatch event `send message`. Event listener will catch the dispatched event and will broadcast messages to thread participants.

## team thread
One should only able to send message, if thread already exists. Api will dispatch event to broadcast newly created thread. Thread updates will also be delivered by socket.

## On hold
If thread were not existed before, api will dispatch another event to broadcast newly created thread to thread participants.

## TODO
- improve user chat counters
- keep blocked users locally
- pre-create users thread listing
- cache authorized users


## Rethink
- group/subject/global thread users?
- notify about new group

## Remember chat message type
- message type: 
    Attachment: "ATTACHMENT", (in case of pdf,zip)
    Info: "INFO",
    Link: "LINK",
    MediaImage: "MEDIA_IMAGE", 
    MediaVideo: "MEDIA_VIDEO",
    MediaAudio: "MEDIA_AUDIO",
    Text: "TEXT",      (in case of plain message)
    RichText: "RICH_TEXT",
    Markdown: "MARKDOWN"

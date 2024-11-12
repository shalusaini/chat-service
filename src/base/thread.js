const ThreadType = {
    Global: "GLOBAL",
    Team: "TEAM",
    Single: "SINGLE"
};

const ThreadMessageType = {
    Attachment: "ATTACHMENT",
    Info: "INFO",
    Link: "LINK",
    MediaImage: "MEDIA_IMAGE",
    MediaVideo: "MEDIA_VIDEO",
    MediaAudio: "MEDIA_AUDIO",
    Text: "TEXT",
    RichText: "RICH_TEXT",
    Markdown: "MARKDOWN"
};

const ThreadEvent = {
    New: "THREAD_NEW",
    Update: "THREAD_UPDATE",
    Modified: "THREAD_MODIFIED"
};

const ThreadMessageEvent = {
    Send: "THREAD_MESSAGE_SEND"
};

module.exports = { ThreadType, ThreadMessageType, ThreadEvent, ThreadMessageEvent };

const StorageStatus = {
    Draft: "DRAFT",
    Pending: "PENDING",
    Used: "USED",
    Removed: "REMOVED"
};

const StorageType = {
    ThreadImage: "THREAD_IMAGE",
    MessageImage: "MESSAGE_IMAGE",
    MessageVideo: "MESSAGE_VIDEO",
    MessageAttachment: "MESSAGE_ATTACHMENT"
};

module.exports = { StorageStatus, StorageType };
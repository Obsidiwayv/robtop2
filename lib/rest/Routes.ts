export default {
    GATEWAY_BOT: "/gateway/bot",
    POST_MESSAGE: (channel: string) => `/channels/${channel}/messages`,
    EDIT_MESSAGE: (channel: string, message: string) => `/channels/${channel}/messages/${message}`
}
import { APIAllowedMentions, APIAttachment, APIEmbedAuthor, APIEmbedField, APIEmbedImage, APIEmbedThumbnail, APIMessageActionRowComponent, APIMessageReference } from "discord-api-types/v10";
import colors from "../../colors.json";

export interface APICustomEmbed {
    author?: APIEmbedAuthor;
    color?: number | keyof typeof colors;
    description?: string;
    fields?: APIEmbedField[];
    footer?: APIEmbedField;
    image?: APIEmbedImage;
    thumbnail?: APIEmbedThumbnail;
    timestamp?: Date | string;
    title?: string;
    url?: string;
}

export interface APICustomContent {
    allowedMentions?: APIAllowedMentions;
    attachments?: APIAttachment[];
    components?: APIMessageActionRowComponent[];
    content?: string;
    embeds?: APICustomEmbed[];
    flags?: number;
    messageReference?: APIMessageReference;
    stickerIDs?: string[];
    tts?: boolean;
}
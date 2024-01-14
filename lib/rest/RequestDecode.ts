import OfficialSongs from "./OfficialSongs";

export default class RequestDecode {
    public parseSearchResults(res: string) {
        let levels = res.split("#")[0].split("|");
        let creators = res.split("#")[1].split("|");
        let songs = res.split("#")[2].split("~:~");

        let result = [];

        let encCreators: {[key: string]: string} = {};
        let encSongs: {[key: string]: any} = {};

        creators.forEach(c => {
            let playerID = c.split(":")[0];
            let username = c.split(":")[1];
            encCreators[playerID] = username;
        })

        songs.forEach(s => {
            let sp = s.split("~|~");
            let songId = sp[1];
            let songName = sp[3];
            let songArtistID = sp[5];
            let songArtist = sp[7];
            let size = sp[9];
            let link = sp[13];

            encSongs[songId] = {
                "name": songName,
                "id": Number(songId),
                "artist": songArtist,
                "artistId": Number(songArtistID),
                "fileSize": `${size} MB`,
                "link": decodeURIComponent(link)
            };
        })

        for (const l of levels) {
            let s = l.split(":");

            let diffObj: {[key: string|number]: string} = {
                "-10": "Auto",
                0: "Unrated",
                10: "Easy",
                20: "Normal",
                30: "Hard",
                40: "Harder",
                50: "Insane"
            }

            if (Boolean(Number(s[21]))) {
                diffObj = {
                    10: "Easy Demon",
                    20: "Medium Demon",
                    30: "Hard Demon",
                    40: "Insane Demon",
                    50: "Extreme Demon"
                }
            }

            const lengthObj: {[key: number]: string} = {
                0: "Tiny",
                1: "Short",
                2: "Medium",
                3: "Long",
                4: "XL",
                5: "Platformer"
            }

            const versionObj: {[key: number]: string} = {
                10: "1.7",
                18: "1.8",
                19: "1.9",
                20: "2.0",
                21: "2.1",
                22: "2.2"
            }

            let lvl: {[key: string]: string|number|boolean} = {
                id: Number(s[1]),
                name: s[3],
                levelVersion: Number(s[5]),
                playerID: Number(s[7]),
                difficulty: diffObj[s[11]],
                stars: Number(s[27]),
                downloads: Number(s[13]),
                likes: Number(s[19]),
                disliked: Number(s[19]) < 0 ? true : false,
                length: lengthObj[Number(s[37])],
                demon: Boolean(Number(s[21])),
                featured: Boolean(Number(s[29])),
                epic: Boolean(Number(s[31])),
                objects: Number(s[33]),
                starsRequested: Number(s[47]),
                gameVersion: versionObj[Number(s[17])] ? versionObj[Number(s[17])] : "Pre-1.7",
                copiedFrom: Number(s[39]),
                large: Number(Number(s[17])) > 4e4 ? true : false,
                twoPlayer: Boolean(Number(s[41])),
                coins: Number(s[43]),
                verifiedCoins: Boolean(Number(s[45]))
            }

            let officialSongID = Number(s[15]);
            let songID = Number(s[53]);
            let playerId = s[7];
            let song;

            if (officialSongID == 0 && songID != 0 || officialSongID != 0 && songID != 0) song = encSongs[songID.toString()];
            if (officialSongID != 0 && songID == 0) song = OfficialSongs(officialSongID + 1);
            if (officialSongID == 0 && songID == 0) song = OfficialSongs(1);

            lvl['creator'] = encCreators[playerId] ? encCreators[playerId] : "-";
            lvl['song'] = song;

            result.push(lvl);
        }
        return result;
    }
}
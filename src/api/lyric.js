/**
 * 歌词 API
 * GET /api/lyric?mid=xxx
 */

import { apiRequest, jsonResponse, errorResponse, handleOptions } from "../lib/request.js";
import { ensureCredentialTable, getCredentialFromDB, parseCredential, saveCredentialToDB } from "../lib/credential.js";
import { qrc_decrypt } from "../lib/tripledes.js";

/**
 * 获取凭证
 */
async function getCredential(env) {
    await ensureCredentialTable(env.DB);
    let credential = await getCredentialFromDB(env.DB);

    if (!credential && env.INITIAL_CREDENTIAL) {
        const initial = parseCredential(env.INITIAL_CREDENTIAL);
        if (initial) {
            await saveCredentialToDB(env.DB, initial);
            credential = initial;
        }
    }

    return credential;
}

/**
 * Base64 解码
 */
function base64Decode(str) {
    try {
        return atob(str);
    } catch {
        return "";
    }
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === "OPTIONS") {
        return handleOptions();
    }

    if (request.method !== "GET") {
        return errorResponse("Method not allowed", 405);
    }

    try {
        const url = new URL(request.url);
        const mid = url.searchParams.get("mid");
        const id = url.searchParams.get("id");
        const format = url.searchParams.get("format") || "auto"; // auto, lrc, qrc, raw

        if (!mid && !id) {
            return errorResponse("Missing required parameter: mid or id", 400);
        }

        const credential = await getCredential(env);

        // 获取歌词
        const params = {
            songmid: mid || "",
            songid: id ? parseInt(id) : 0,
            format: "json",
        };

        const data = await apiRequest(
            "music.musichallSong.PlayLyricInfo",
            "GetPlayLyricInfo",
            params,
            credential
        );

        const result = {
            code: 0,
            data: {
                mid: mid || "",
                id: id || "",
            },
        };

        // 处理普通歌词 (LRC)
        if (data.lyric) {
            let lyricContent = base64Decode(data.lyric);
            // 如果不是以 [ 开头，说明是加密的 Hex 格式，需要解密
            if (lyricContent && !lyricContent.startsWith('[')) {
                try {
                    const decrypted = await qrc_decrypt(lyricContent);
                    if (decrypted) lyricContent = decrypted;
                } catch (e) {
                    console.warn("LRC 歌词解密失败:", e);
                }
            }
            result.data.lyric = lyricContent;
        }

        // 处理翻译歌词
        if (data.trans) {
            let transContent = base64Decode(data.trans);
            // 如果不是以 [ 开头，说明是加密的 Hex 格式，需要解密
            if (transContent && !transContent.startsWith('[')) {
                try {
                    const decrypted = await qrc_decrypt(transContent);
                    if (decrypted) transContent = decrypted;
                } catch (e) {
                    console.warn("翻译歌词解密失败:", e);
                }
            }
            result.data.trans = transContent;
        }

        // 处理 QRC 歌词 (需要解密)
        if (data.qrc && format !== "lrc") {
            try {
                const qrcContent = await qrc_decrypt(data.qrc);
                result.data.qrc = qrcContent;
            } catch (e) {
                console.warn("QRC 解密失败:", e);
            }
        }

        // 处理罗马音歌词
        if (data.roma) {
            let romaContent = base64Decode(data.roma);
            // 如果不是以 [ 开头，说明是加密的 Hex 格式，需要解密
            if (romaContent && !romaContent.startsWith('[')) {
                try {
                    const decrypted = await qrc_decrypt(romaContent);
                    if (decrypted) romaContent = decrypted;
                } catch (e) {
                    console.warn("罗马音歌词解密失败:", e);
                }
            }
            result.data.roma = romaContent;
        }

        return jsonResponse(result);

    } catch (err) {
        console.error("获取歌词失败:", err);
        return errorResponse(err.message, 500);
    }
}

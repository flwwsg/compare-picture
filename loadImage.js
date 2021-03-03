const fs = require("fs");
const http = require("https");
const Canvas = require("canvas");
const imageType = require("image-type");
const bmp = require("bmp-js");

// 加载图片

function getLimitDimensions(width, height, limit) {
    if (limit && width >= limit && height >= limit) {
        const ratio = width / height;

        if (ratio > 1) {
            return { height: limit, width: Math.round(limit / ratio) };
        }
        return { height: Math.round(limit * ratio), width: limit };
    }
    return { width, height };
}

function parse(data, limit) {
    const { ext = "" } = imageType(data) || {};

    return new Promise((resolve, reject) => {
        if (ext === "bmp") {
            resolve(bmp.decode(data));
        } else {
            Canvas.loadImage(data)
                .then(img => {
                    const { width, height } = getLimitDimensions(
                        img.width,
                        img.height,
                        limit
                    );
                    const canvas = Canvas.createCanvas(width, height);
                    const ctx = canvas.getContext("2d");

                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);

                    return ctx.getImageData(0, 0, width, height);
                })
                .then(resolve)
                .catch(reject);
        }
    });
}

function loadUrl(url) {
    return new Promise((resolve, reject) => {
        http
            .get(url)
            .on("response", res => {
                const chunks = [];

                res.on("data", data => chunks.push(data));
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            })
            .on("error", reject);
    });
}

function loadFs(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });
}

module.exports = (filepath, limit = 0) =>
    loadFs(filepath).then(bufferData => parse(bufferData, limit));

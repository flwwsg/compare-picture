const { sizeOf } = require('node-utils/images');
const path = require('path');

const categoryByImageSize = (allFiles, parentPath) => {
    const allSize = {};
    // 获取所有文件大小
    for (let i =0 ; i < allFiles.length; i++) {
        const f = allFiles[i];
        const fullPath = path.join(parentPath, f);
        const img = sizeOf(fullPath);
        allSize[f] = { width: img.width, height: img.height, category: false };
    }
    const result = { others: []};
    for (let i = 0; i < allFiles.length; i++) {
        const f = allFiles[i];
        if (allSize[f].category) {
            // 已经找过了
            continue;
        }
        const width = allSize[f].width;
        const height = allSize[f].height;
        const res = [f];
        for (let j = i + 1; j < allFiles.length; j++) {
            const f = allFiles[j];
            if (allSize[f].width === width && allSize[f].height === height) {
                allSize[f].category = true;
                res.push(f);
            }
        }
        if (res.length > 1) {
            result[`${width}x${height}`] = res;
        } else {
            // 只有一张的
            result.others.push(res[0]);
        }
    }
    return result;
}

module.exports = {
    categoryByImageSize,
}

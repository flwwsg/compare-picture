const imgSSIM = require('img-ssim');
const path = require('path');
const fs = require("fs");
const { fileExists, mkDir } = require('node-utils/files');

let working = false;
// compare with ssim.js
function compareWithSsim(p1, p2, cb) {
    imgSSIM(
	    p1,
	    p2,
	    { enforceSameSize: false, resize: true },
	    (err, s) => {
	    	if (cb) {
	    		return cb(err, s);
			}
		    if (err) {
		    	console.error(err);
		    	return 0;
			}
		    return s;
	    }
    );
}

const imageDir = path.join(__dirname, 'images');
const category = path.join(__dirname, 'category');
mkDir(category);
const allFiles = fs.readdirSync(imageDir).slice(0, 20);
let nextCount = 0;
// 并发数
const concurrent = 10;
function main() {
	const go = function (i) {
		nextCount ++;
		if (nextCount % concurrent !== 0) {
			// 不是最后一个完成的
			return;
		}
		for (let next = i; next < concurrent + i; next++) {
			if (next < allFiles.length -1) {
				// go on
				const srcFile = path.join(imageDir, allFiles[next]);
				const cmp = function (start, j) {
					if (j >= allFiles.length) {
						// 下一循环
						return go(start+1);
					}
					console.log('compare', start, j);
					const targetFile = path.join(imageDir, allFiles[j]);
					const cb = (srcFile, targetFile) => {
						return (err, s) => {
							if (err) {
								console.error(err);
								return cmp(start, j+1);
							}
							console.log('similar degree', s);
							if (s >= 0.7) {
								const baseName = path.basename(srcFile, '.png');
								const categoryDir = path.join(category, baseName);
								mkDir(categoryDir);
								// 目标文件复制到 category 目录中
								fs.copyFileSync(targetFile, path.join(categoryDir, path.basename(targetFile)));
								if (!fileExists(path.join(categoryDir, path.basename(srcFile)))) {
									fs.copyFileSync(srcFile, path.join(categoryDir, path.basename(srcFile)));
								}
							}
							return cmp(start, j+1);
						}
					}
					return compareWithSsim(srcFile, targetFile, cb(srcFile, targetFile));
				}
				cmp(next, next+1);
			} else {
				console.log('finish', next);
				break;
			}
		}
	}
	go(0);
}

main();

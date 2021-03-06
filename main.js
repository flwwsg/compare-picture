// const imgSSIM = require('img-ssim');
ImageParser = require("image-parser")
const imgSSIM = require('./mySSIM');
const path = require('path');
const fs = require("fs");
const { fileExists, mkDir } = require('node-utils/files');
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');

const imageDir = path.join(__dirname, 'images');
const category = path.join(__dirname, 'category');
mkDir(category);
const allFiles = fs.readdirSync(imageDir).slice(0, 100);

// loading all image
const imageParser = {};
for (const f of allFiles) {
	const srcFile = path.join(imageDir, f);
	imageParser[srcFile] = new ImageParser(srcFile);
}

// compare with ssim.js
function compareWithSsim(p1, p2, cb) {
    imgSSIM(
    	imageParser,
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

// let nextCount = 0;
// // 并发数
// const concurrent = 1;
const start = Date.now();
// function main() {
// 	const go = function () {
// 		console.log('nextCount', nextCount);
// 		if (nextCount === allFiles.length - 1) {
// 			console.log('complete in', (Date.now() - start) / 1000);
// 		}
// 		if (nextCount % concurrent !== 0) {
// 			// 不是最后一个完成的
// 			nextCount++;
// 			return;
// 		}
// 		nextCount ++;
// 		for (let next = nextCount - 1; next < concurrent + nextCount - 1; next++) {
// 			if (next < allFiles.length -1) {
// 				// go on
// 				const srcFile = path.join(imageDir, allFiles[next]);
// 				const cmp = function (start, j) {
// 					if (j >= allFiles.length) {
// 						// 下一循环
// 						return go();
// 					}
// 					const targetFile = path.join(imageDir, allFiles[j]);
// 					const cb = (srcFile, targetFile) => {
// 						return (err, s) => {
// 							if (err) {
// 								console.error('err', err);
// 								return cmp(start, j+1);
// 							}
// 							if (isNaN(s)) {
// 								console.log('skip', start, j, srcFile, targetFile);
// 								return cmp(start, j+1);
// 							}
// 							console.log('similar degree', start, j, s);
// 							if (s >= 0.7) {
// 								const baseName = path.basename(srcFile, '.png');
// 								const categoryDir = path.join(category, baseName);
// 								mkDir(categoryDir);
// 								// 目标文件复制到 category 目录中
// 								fs.copyFileSync(targetFile, path.join(categoryDir, path.basename(targetFile)));
// 								if (!fileExists(path.join(categoryDir, path.basename(srcFile)))) {
// 									fs.copyFileSync(srcFile, path.join(categoryDir, path.basename(srcFile)));
// 								}
// 							}
// 							return cmp(start, j+1);
// 						}
// 					}
// 					return compareWithSsim(srcFile, targetFile, cb(srcFile, targetFile));
// 				}
// 				cmp(next, next+1);
// 			} else {
// 				console.log('finish', next);
// 				break;
// 			}
// 		}
// 	}
// 	go();
// }

const step = Math.floor(allFiles.length / numCPUs);
const stepList = [];
for (let i = 0; i < numCPUs; i++) {
	if (i+1 < numCPUs) {
		stepList.push({ startPos: i*step, endPos: (i+1)*step });
	} else {
		// last one
		stepList.push({ startPos: i*step, endPos: allFiles.length });
	}
}

function selectOne() {
	let nextCount = 0;
	const pos = stepList[process.env['workIndex']];
	const startPos = pos.startPos;
	const endPos = pos.endPos;
	console.log(startPos, endPos, nextCount);
	const go = function (next) {
		console.log('nextCount', nextCount);
		if (next === endPos) {
			console.log('complete in', (Date.now() - start) / 1000);
			process.exit(0);
		}
		nextCount ++;
		if (next < endPos) {
			// go on
			const srcFile = path.join(imageDir, allFiles[next]);
			const cmp = function (start, j) {
				if (j >= allFiles.length) {
					// 下一循环
					return go(start+1);
				}
				const targetFile = path.join(imageDir, allFiles[j]);
				const cb = (srcFile, targetFile) => {
					return (err, s) => {
						if (err) {
							console.error('err', err);
							return cmp(start, j+1);
						}
						if (isNaN(s)) {
							console.log('skip', start, j, srcFile, targetFile);
							return cmp(start, j+1);
						}
						console.log('similar degree', start, j, s);
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
		}
	}
	go(startPos);
}


if (cluster.isMaster) {
	// Fork workers.
	for (let i = 0; i < numCPUs; i++) {
		cluster.fork({ workIndex: i+1 });
	}

	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
	});
} else {
	selectOne();
}
// const imgSSIM = require('img-ssim');
const imgSSIM = require('./mySSIM');
const path = require('path');
const fs = require("fs");
const { fileExists, mkDir } = require('node-utils/files');
const { categoryByImageSize } = require('./tools');
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
// kill -USR2 <pid> 使用
const hd = require('heapdump');

const imageDir = path.join(__dirname, 'images');
const categoryDir = path.join(__dirname, 'category');
mkDir(categoryDir);
const allFiles = fs.readdirSync(imageDir);
// 手动调用内存
function writeSnapshot() {
	hd.writeSnapshot(path.join(path.join(__dirname, 'tmp'), Date.now().toString()+'.heapsnapshot'));
}
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

const startTime = Date.now();

// one by one
function selectOne() {
	let nextCount = 0;
	const modNum = parseInt(process.env['workIndex']);
	const go = function (next) {
		console.log('nextCount', nextCount);
		if (next === allFiles.length) {
			console.log('complete in', (Date.now() - startTime) / 1000);
			process.exit(0);
		}
		nextCount ++;
		if (next % numCPUs !== modNum) {
			return go(next + 1);
		}
		if (next < allFiles.length) {
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
							const categoryDir = path.join(categoryDir, baseName);
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
	go(0);
}

// 每次最多载入的图片
const maxLoading = 250;

// for 循环版
function selectOneConcurrent() {
	const modNum = parseInt(process.env['workIndex']);
	let counter = 0;
	const go = function (next) {
		if (next % numCPUs !== modNum) {
			return go(next + 1);
		}
		if (counter !== 0 && counter !== allFiles.length - next + numCPUs - 1) {
			return setTimeout( function () {
				console.log('counter', counter, 'need', allFiles.length - next + numCPUs - 1,);
				return go(next);
			}, 1000);
		}
		counter = 0;
		console.log('nextCount loop', next);
		if (next < allFiles.length - 1) {
			// go on
			const srcFile = path.join(imageDir, allFiles[next]);
			const cmp = nextCmp => {
				for (let j = nextCmp + 1; j < nextCmp + maxLoading + 1; j++) {
					if (j > allFiles.length - 1 ){
						// 坐等执行完
						break;
					}
					const targetFile = path.join(imageDir, allFiles[j]);
					const cb = (srcFile, targetFile, start, index) => {
						return (err, s) => {
							if (err) {
								console.error('err', err);
							} else if (isNaN(s)) {
								console.log('skip', start, j, srcFile, targetFile);
							} else {
								console.log('similar degree', start, index, s);
								if (s >= 0.7) {
									const baseName = path.basename(srcFile, '.png');
									const categoryDir = path.join(categoryDir, baseName);
									mkDir(categoryDir);
									// 目标文件复制到 category 目录中
									fs.copyFileSync(targetFile, path.join(categoryDir, path.basename(targetFile)));
									if (!fileExists(path.join(categoryDir, path.basename(srcFile)))) {
										fs.copyFileSync(srcFile, path.join(categoryDir, path.basename(srcFile)));
									}
								}
							}
							counter++;
							if (index === allFiles.length-1) {
								return go(start+1);
							} else if (nextCmp + maxLoading === index){
								// 最后一个，执行下一组
								return cmp(index);
							}
						}
					}
					compareWithSsim(srcFile, targetFile, cb(srcFile, targetFile, next, j));
				}
			}
			cmp(next);
		} else {
			console.log('complete in', (Date.now() - startTime) / 1000);
			process.exit(0);
		}
	}
	go(0);
}

function runCluster() {
	if (cluster.isMaster) {
		// Fork workers.
		for (let i = 0; i < numCPUs; i++) {
			cluster.fork({ workIndex: i });
		}

		cluster.on('exit', function(worker, code, signal) {
			console.log('worker ' + worker.process.pid + ' died');
		});
	} else {
		// selectOne();
		selectOneConcurrent();
	}
}

// 按图片大小分类
function sortBySize() {
	const res = categoryByImageSize(allFiles, imageDir);
	mkDir(path.join(categoryDir, 'size'));
	for (const k of Object.keys(res)) {
		mkDir(path.join(categoryDir, 'size', k));
		for (const f of res[k]){
			if (!fileExists(path.join(categoryDir, 'size', k, f))) {
				fs.copyFileSync(path.join(imageDir, f), path.join(categoryDir, 'size', k, f));
			}
		}
	}
}

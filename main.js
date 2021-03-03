// const { ssim } = require('ssim.js');
// const loadImage = require('./loadImage');
const imgSSIM = require('img-ssim');

// compare with ssim.js
function compareWithSsim() {
    const p1 = './4ae7014e-b3ab-41fd-a416-abbe276f5b1a.png';
    const p2 = './4af88fe1-a2af-4e7a-85a5-ca94d9e12da8.png';
//    const { mssim, performance } = ssim(p1, p2);
//    console.log(`SSIM: ${mssim} (${performance}ms)`);
    imgSSIM(
	    p1,
	    p2,
	    { enforceSameSize: false, resize: true },
	    (err, s) => {
		    console.log(err || s);
	    }
    );
}

compareWithSsim();

const imgSSIM = require('img-ssim');

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
const p1 = './4ae7014e-b3ab-41fd-a416-abbe276f5b1a.png';
const p2 = './4af88fe1-a2af-4e7a-85a5-ca94d9e12da8.png';
const cb = (err, s) => {
	if (err) {
		console.error(err);
		return 0;
	}
	console.log(s);
	return s;
}
compareWithSsim(p1, p2, cb);

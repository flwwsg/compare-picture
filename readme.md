### 比较 2 张图片的相似度

### canvas 编译失败
ref: https://www.npmjs.com/package/canvas

### gm conversion issue in node.js. 
ref: https://stackoverflow.com/questions/31214724/gm-conversion-issue-in-node-js

solution: install image magick
# ubuntu
sudo apt-get install graphicsmagick

或者

sudo apt-get install imagemagick

# manjaro 
pacman -S graphicsmagick
pacman -S imagemagick
安装库 (manjaro)
- cairo
- pango
- libjpeg-turbo
- giflib
- librsvg


npm i node-pre-gyp

### 测试
20 png 4 cores

first version: 150s
ssim with cache version: 140.102s
cut png size version: 41s
multiple core version: 22s


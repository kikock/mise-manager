const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 创建目录
const buildDir = path.join(__dirname, 'build');
const assetsDir = path.join(__dirname, 'renderer', 'assets');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

/**
 * 纯 Node.js 生成 256x256 RGBA 渐变图标 PNG (Windows 11 Fluent 风格)
 */
function createFluentIconPng(width, height) {
  // RGBA 缓冲区，每个像素 4 字节
  const rawData = Buffer.alloc(height * (1 + width * 4)); // 每行开头加 1 字节 filter type 0
  let p = 0;

  const cx = width / 2;
  const cy = height / 2;
  const rCorner = 48; // 圆角半径
  const pad = 16;
  const minX = pad, maxX = width - pad;
  const minY = pad, maxY = height - pad;

  for (let y = 0; y < height; y++) {
    rawData[p++] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      // 检查是否在圆角矩形内
      let inShape = true;
      let alpha = 255;

      // 边界检测
      if (x < minX || x >= maxX || y < minY || y >= maxY) {
        inShape = false;
      } else {
        // 四个圆角判断
        const checkCorner = (cx0, cy0) => {
          const dx = x - cx0;
          const dy = y - cy0;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > rCorner) {
            inShape = false;
            // 简单抗锯齿边缘
            if (dist < rCorner + 1.2) {
              inShape = true;
              alpha = Math.max(0, Math.min(255, Math.floor((rCorner + 1.2 - dist) * 255)));
            }
          }
        };

        if (x < minX + rCorner && y < minY + rCorner) checkCorner(minX + rCorner, minY + rCorner);
        else if (x >= maxX - rCorner && y < minY + rCorner) checkCorner(maxX - rCorner - 1, minY + rCorner);
        else if (x < minX + rCorner && y >= maxY - rCorner) checkCorner(minX + rCorner, maxY - rCorner - 1);
        else if (x >= maxX - rCorner && y >= maxY - rCorner) checkCorner(maxX - rCorner - 1, maxY - rCorner - 1);
      }

      if (!inShape) {
        rawData[p++] = 0;
        rawData[p++] = 0;
        rawData[p++] = 0;
        rawData[p++] = 0;
        continue;
      }

      // 背景渐变：深邃蓝紫 (#1e1b4b) 到 Fluent 亮蓝青 (#0284c7)
      const t = (x + y) / (width + height);
      let r = Math.floor(30  * (1 - t) + 2   * t);
      let g = Math.floor(27  * (1 - t) + 132 * t);
      let b = Math.floor(75  * (1 - t) + 199 * t);

      // 内发光 / 边框
      const distFromEdge = Math.min(x - minX, maxX - 1 - x, y - minY, maxY - 1 - y);
      if (distFromEdge <= 2) {
        r = Math.min(255, r + 90);
        g = Math.min(255, g + 90);
        b = Math.min(255, b + 120);
      }

      // 绘制中心图形：'m.'
      // 字母 m 的两个拱门 (拱 1: x in [70, 120], 拱 2: x in [130, 180], 高度 [90, 170])
      const isVerticalStem = (x >= 64 && x <= 80 && y >= 100 && y <= 170);
      const isArch1 = (Math.hypot(x - 105, y - 105) <= 26 && Math.hypot(x - 105, y - 105) >= 12 && y <= 105) ||
                      (x >= 118 && x <= 134 && y >= 105 && y <= 170);
      const isArch2 = (Math.hypot(x - 158, y - 105) <= 26 && Math.hypot(x - 158, y - 105) >= 12 && y <= 105) ||
                      (x >= 171 && x <= 187 && y >= 105 && y <= 170);
      const isDot = (Math.hypot(x - 200, y - 162) <= 8);

      if (isVerticalStem || isArch1 || isArch2 || isDot) {
        // 高光纯白与电光青色 (#38bdf8) 渐变
        const ty = (y - 90) / 80;
        r = Math.floor(255 * (1 - ty) + 56  * ty);
        g = Math.floor(255 * (1 - ty) + 189 * ty);
        b = Math.floor(255 * (1 - ty) + 248 * ty);
      }

      // 右下角绿色就绪徽章 (Green Active Dot at [192, 192])
      const dotDist = Math.hypot(x - 192, y - 192);
      if (dotDist <= 18) {
        if (dotDist > 14) {
          // 纯白描边
          r = 255; g = 255; b = 255;
        } else {
          // 翠绿 #10b981
          r = 16; g = 185; b = 129;
        }
      }

      rawData[p++] = r;
      rawData[p++] = g;
      rawData[p++] = b;
      rawData[p++] = alpha;
    }
  }

  // 组装标准 PNG
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, makeChunk('IHDR', ihdr), idat, iend]);
}

/**
 * 封装为 Windows ICO 文件 (内嵌标准 PNG)
 */
function createIcoFromPng(pngBuffer, size = 256) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // count of images = 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // size of image data
  entry.writeUInt32LE(6 + 16, 12); // offset of image data

  return Buffer.concat([header, entry, pngBuffer]);
}

// 执行生成
const pngBuf = createFluentIconPng(256, 256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuf);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuf);

const icoBuf = createIcoFromPng(pngBuf, 256);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);

console.log('✅ 成功生成 Windows Fluent 图标:');
console.log('   - build/icon.png (256x256)');
console.log('   - build/icon.ico (Windows 规范图标)');
console.log('   - renderer/assets/icon.png');

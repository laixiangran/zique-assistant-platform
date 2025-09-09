const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 自动增加版本号
function incrementVersion(version) {
  const parts = version.split('.');
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

// 读取并更新版本号
const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const oldVersion = packageJson.version;
const newVersion = incrementVersion(oldVersion);

// 更新 package.json 版本号
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// 更新 package-lock.json 版本号（如果存在）
const packageLockPath = path.resolve(__dirname, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  packageLock.version = newVersion;
  if (packageLock.packages && packageLock.packages['']) {
    packageLock.packages[''].version = newVersion;
  }
  fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2));
}

console.log(`📦 版本号已从 ${oldVersion} 更新到 ${newVersion}`);
const version = newVersion;

// 创建输出流和归档器
const zipName = `zique-assistant-platform_${version}.zip`;
const output = fs.createWriteStream(path.resolve(__dirname, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

// 监听完成事件
output.on('close', () => {
  console.log(`✅ 打包完成: ${zipName} (${archive.pointer()} bytes)`);
});

// 监听警告事件
archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️ 归档警告:', err);
  } else {
    throw err;
  }
});

// 监听错误事件
archive.on('error', (err) => {
  throw err;
});

// 管道到输出流
archive.pipe(output);

// 添加需要打包的文件和目录
const filesToArchive = ['.next', 'package-lock.json', 'package.json'];
filesToArchive.forEach((file) => {
  const filePath = path.resolve(__dirname, file);
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      archive.directory(filePath, file);
    } else {
      archive.file(filePath, { name: file });
    }
  } else {
    console.warn(`⚠️ 文件或目录不存在: ${filePath}`);
  }
});

// 完成归档
archive.finalize();
